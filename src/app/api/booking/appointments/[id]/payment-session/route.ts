import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAppointmentCheckoutSession } from "@/integrations/stripe/server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { readGuestAccessToken } from "@/lib/server/guest-access";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyTokenHash } from "@/lib/server/tokens";
import { parseUuidParam } from "@/lib/server/validation";

const paymentSessionSchema = z.object({
  token: z.string().trim().min(24).max(256).optional(),
}).strict();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const appointmentId = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const body = await parseJson(request, paymentSessionSchema);
    await enforceRateLimit(getClientFingerprint(request), `appointment_payment:${appointmentId}`, 6, 300);

    const token = readGuestAccessToken(request, appointmentId, body.token);
    const { appointment, amountCents, serviceName } = await authorizeAndPreparePayment(appointmentId, token);
    const session = await createAppointmentCheckoutSession({
      origin: request.nextUrl.origin,
      appointmentId,
      serviceName,
      startsAt: appointment.starts_at,
      amountCents,
      currency: appointment.payment_currency ?? "brl",
      customerEmail: appointment.customer_email,
      userId: appointment.user_id,
    });

    const supabase = getSupabaseAdminClient();
    await supabase
      .from("appointments")
      .update({
        payment_method: "online",
        payment_status: "pending",
        payment_amount_cents: amountCents,
        payment_currency: (appointment.payment_currency ?? "brl").toLowerCase(),
        stripe_checkout_session_id: session.id,
      })
      .eq("id", appointmentId);

    await supabase.from("payment_records").upsert(
      {
        appointment_id: appointmentId,
        profile_id: appointment.user_id,
        provider: "stripe",
        provider_reference: session.id,
        amount_cents: amountCents,
        currency: (appointment.payment_currency ?? "brl").toLowerCase(),
        status: "pending",
        metadata: {
          checkout_session_id: session.id,
          source: "customer_checkout",
        },
      },
      { onConflict: "provider,provider_reference" },
    );

    return jsonOk({ checkoutUrl: session.url });
  } catch (error) {
    return jsonError(error);
  }
}

async function authorizeAndPreparePayment(appointmentId: string, token?: string) {
  const supabase = getSupabaseAdminClient();
  const { user } = await getAuthenticatedUser().catch(() => ({ user: null }));
  const { data, error } = await supabase
    .from("appointments")
    .select("id,user_id,starts_at,status,customer_email,guest_access_token_hash,payment_status,payment_amount_cents,payment_currency,services(name,price_cents)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  const ownsAppointment = Boolean(user && data.user_id === user.id);
  const tokenMatches = Boolean(token && verifyTokenHash(token, data.guest_access_token_hash));

  if (!ownsAppointment && !tokenMatches) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  if (data.status === "cancelled" || data.status === "no_show") {
    throw new ApiError(409, "Este agendamento nao aceita pagamento online.");
  }

  if (data.payment_status === "paid") {
    throw new ApiError(409, "Pagamento ja confirmado.");
  }

  const service = Array.isArray(data.services) ? data.services[0] : data.services;
  const amountCents = data.payment_amount_cents || service?.price_cents || 0;

  if (amountCents < 100) {
    throw new ApiError(409, "Servico sem valor online configurado.");
  }

  return {
    appointment: data,
    amountCents,
    serviceName: service?.name ?? "Agendamento",
  };
}

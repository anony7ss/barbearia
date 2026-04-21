import { type NextRequest } from "next/server";
import { bookingRequestSchema } from "@/features/booking/schemas";
import { createAppointmentCheckoutSession, isStripeConfigured } from "@/integrations/stripe/server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { isTransactionalEmailConfigured, sendBookingConfirmationEmail } from "@/integrations/email/resend";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { getAvailabilityForRequest } from "@/lib/server/booking";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";
import { scheduleAppointmentLifecycleJobs } from "@/lib/server/notifications";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { createAccessToken, createLookupCode, hashToken } from "@/lib/server/tokens";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import { normalizeEmail } from "@/lib/utils";
import type { Json } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "booking_create", 8, 60);
    const body = await parseJson(request, bookingRequestSchema);
    await enforceRateLimit(body.customerPhone, "booking_create_phone", 3, 3600);
    await enforceRateLimit(normalizeEmail(body.customerEmail), "booking_create_email", 3, 3600);

    if (process.env.NODE_ENV === "production" && !isTransactionalEmailConfigured()) {
      throw new ApiError(500, "Email transacional nao configurado.");
    }
    if (body.paymentMethod === "online" && !isStripeConfigured()) {
      throw new ApiError(500, "Pagamento online nao configurado.");
    }

    await verifyTurnstileToken(body.turnstileToken, request.headers.get("x-forwarded-for"));
    const date = body.startsAt.slice(0, 10);
    const slots = await getAvailabilityForRequest({
      serviceId: body.serviceId,
      barberId: body.barberId,
      date,
    });
    const requestedBarberId = body.barberId && body.barberId !== "any" ? body.barberId : null;
    const selected = slots.find(
      (slot) => slot.startsAt === body.startsAt && (!requestedBarberId || slot.barberId === requestedBarberId),
    );

    if (!selected) {
      throw new ApiError(409, "Horario indisponivel.");
    }

    const { user } = await getAuthenticatedUser();
    const supabase = getSupabaseAdminClient();
    const lookupCode = createLookupCode();
    const accessToken = createAccessToken();
    const email = normalizeEmail(body.customerEmail);

    const { data: service } = await supabase
      .from("services")
      .select("name,price_cents")
      .eq("id", body.serviceId)
      .maybeSingle();

    if (!service) {
      throw new ApiError(400, "Servico invalido.");
    }

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        user_id: user?.id ?? null,
        service_id: body.serviceId,
        barber_id: selected.barberId,
        starts_at: selected.startsAt,
        ends_at: selected.endsAt,
        customer_name: body.customerName,
        customer_email: email,
        customer_phone: body.customerPhone,
        guest_lookup_code: lookupCode,
        guest_access_token_hash: hashToken(accessToken),
        notes: body.notes || null,
        status: "confirmed",
        source: user ? "account" : "guest",
        payment_method: body.paymentMethod,
        payment_status: body.paymentMethod === "online" ? "pending" : "unpaid",
        payment_amount_cents: service.price_cents,
        payment_currency: "brl",
      })
      .select("id,starts_at,ends_at")
      .single();

    if (error || !appointment) {
      throw new ApiError(409, "Horario indisponivel.");
    }

    await supabase.from("appointment_guests").insert({
      appointment_id: appointment.id,
      name: body.customerName,
      email,
      phone: body.customerPhone,
      lookup_code: lookupCode,
      access_token_hash: hashToken(accessToken),
    });
    await scheduleAppointmentLifecycleJobs(supabase, appointment.id, appointment.starts_at, appointment.ends_at);

    const manageUrl = `/meus-agendamentos?id=${appointment.id}`;
    const successUrl = `/agendamento/sucesso?id=${appointment.id}&code=${lookupCode}`;
    const emailManageUrl =
      `${process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin}` +
      `/api/booking/access?appointmentId=${appointment.id}` +
      `&token=${encodeURIComponent(accessToken)}` +
      `&next=${encodeURIComponent("/meus-agendamentos")}`;

    const confirmationInput = {
      to: email,
      customerName: body.customerName,
      serviceName: service?.name ?? "servico",
      startsAt: new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(appointment.starts_at)),
      lookupCode,
      manageUrl: emailManageUrl,
    };

    let paymentCheckoutUrl: string | null = null;
    if (body.paymentMethod === "online") {
      try {
        const session = await createAppointmentCheckoutSession({
          origin: request.nextUrl.origin,
          appointmentId: appointment.id,
          serviceName: service.name,
          startsAt: appointment.starts_at,
          amountCents: service.price_cents,
          currency: "brl",
          customerEmail: email,
          userId: user?.id ?? null,
          accessToken,
        });

        paymentCheckoutUrl = session.url;
        await supabase
          .from("appointments")
          .update({ stripe_checkout_session_id: session.id })
          .eq("id", appointment.id);
        await supabase.from("payment_records").upsert(
          {
            appointment_id: appointment.id,
            profile_id: user?.id ?? null,
            provider: "stripe",
            provider_reference: session.id,
            amount_cents: service.price_cents,
            currency: "brl",
            status: "pending",
            metadata: {
              checkout_session_id: session.id,
              source: "booking_flow",
            },
          },
          { onConflict: "provider,provider_reference" },
        );
      } catch {
        logSecureEvent({
          level: "warn",
          event: "booking_payment_checkout_failed",
          route: "/api/booking/appointments",
          request,
          actorId: user?.id ?? null,
          appointmentId: appointment.id,
        });
      }
    }

    let emailStatus: "sent" | "queued" | "skipped" = "skipped";
    try {
      const result = await sendBookingConfirmationEmail(confirmationInput);
      emailStatus = result.skipped ? "skipped" : "sent";
      await recordNotification(supabase, {
        appointmentId: appointment.id,
        destination: email,
        status: result.skipped ? "cancelled" : "sent",
        payload: { template: "booking_confirmation", lookupCode },
        sentAt: result.skipped ? null : new Date().toISOString(),
      });
    } catch (emailError) {
      emailStatus = "queued";
      logSecureEvent({
        level: "warn",
        event: "booking_confirmation_email_failed",
        route: "/api/booking/appointments",
        request,
        actorId: user?.id ?? null,
        appointmentId: appointment.id,
      });
      await recordNotification(supabase, {
        appointmentId: appointment.id,
        destination: email,
        status: "failed",
        payload: { template: "booking_confirmation", lookupCode },
        errorMessage: safeEmailError(emailError),
      });
      await supabase.from("notification_jobs").insert({
        appointment_id: appointment.id,
        channel: "email",
        template: "booking_confirmation",
        scheduled_for: new Date().toISOString(),
        last_error: safeEmailError(emailError),
      });
    }

    return jsonOk({
      appointmentId: appointment.id,
      lookupCode,
      accessToken,
      manageUrl,
      successUrl,
      emailStatus,
      paymentStatus: body.paymentMethod === "online" ? "pending" : "unpaid",
      paymentMethod: body.paymentMethod,
      paymentCheckoutUrl,
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function recordNotification(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  input: {
    appointmentId: string;
    destination: string;
    status: "sent" | "failed" | "cancelled";
    payload: Json;
    sentAt?: string | null;
    errorMessage?: string | null;
  },
) {
  await supabase.from("notifications").insert({
    appointment_id: input.appointmentId,
    channel: "email",
    destination: input.destination,
    status: input.status,
    payload: input.payload,
    sent_at: input.sentAt ?? null,
    error_message: input.errorMessage ?? null,
  });
}

function safeEmailError(error: unknown) {
  return safeOperationalError(error, "Erro ao enviar email.");
}

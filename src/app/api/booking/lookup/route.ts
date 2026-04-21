import { type NextRequest } from "next/server";
import { appointmentLookupSchema } from "@/features/booking/schemas";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { getAppointmentPolicy } from "@/lib/appointment-policy";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { setGuestAccessCookie } from "@/lib/server/guest-access";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { createAccessToken, hashToken } from "@/lib/server/tokens";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import { normalizeEmail, normalizePhone } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "booking_lookup", 12, 60);
    const body = await parseJson(request, appointmentLookupSchema);
    await verifyTurnstileToken(body.turnstileToken, request.headers.get("x-forwarded-for"));
    const supabase = getSupabaseAdminClient();
    const contact = body.contact.includes("@")
      ? normalizeEmail(body.contact)
      : normalizePhone(body.contact);
    const lookupCode = body.code.trim().toUpperCase();

    await enforceRateLimit(`${contact}:${lookupCode}`, "booking_lookup_contact", 5, 300);

    const rpcResult = await supabase.rpc("get_guest_appointment_details", {
      p_code: lookupCode,
      p_contact: contact,
    });

    if (rpcResult.error) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    if (rpcResult.data?.length) {
      const appointment = mapGuestAppointment(rpcResult.data[0]);
      const settings = await getPolicySettings();
      const accessToken = createAccessToken();
      const accessTokenHash = hashToken(accessToken);
      await Promise.all([
        supabase
          .from("appointments")
          .update({ guest_access_token_hash: accessTokenHash })
          .eq("id", appointment.id),
        supabase
          .from("appointment_guests")
          .update({ access_token_hash: accessTokenHash })
          .eq("appointment_id", appointment.id),
      ]);
      const response = jsonOk({
        appointment: {
          ...appointment,
          policy: getAppointmentPolicy(appointment, settings),
        },
      });
      setGuestAccessCookie(response, appointment.id, accessToken);
      return response;
    }

    throw new ApiError(404, "Agendamento nao encontrado.");
  } catch (error) {
    return jsonError(error);
  }
}

type GuestAppointmentDetails = {
  id: string;
  service_id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  payment_method: "pay_at_shop" | "online";
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  payment_amount_cents: number;
  payment_currency: string;
  service_name: string;
  service_price_cents: number;
  service_duration_minutes: number;
  barber_name: string;
};

function mapGuestAppointment(row: GuestAppointmentDetails) {
  return {
    id: row.id,
    service_id: row.service_id,
    barber_id: row.barber_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    payment_amount_cents: row.payment_amount_cents,
    payment_currency: row.payment_currency,
    services: {
      name: row.service_name,
      price_cents: row.service_price_cents,
      duration_minutes: row.service_duration_minutes,
    },
    barbers: {
      name: row.barber_name,
    },
  };
}

async function getPolicySettings() {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("business_settings")
    .select("cancellation_limit_minutes,reschedule_limit_minutes")
    .eq("id", true)
    .maybeSingle();

  return data;
}

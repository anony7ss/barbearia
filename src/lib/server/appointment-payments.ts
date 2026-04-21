import "server-only";

import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError } from "@/lib/server/api";
import { logSecureEvent } from "@/lib/server/logging";
import type { Json } from "@/types/database";

type SyncResult = {
  appointmentId: string;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "refunded";
};

export async function syncAppointmentPaymentFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<SyncResult | null> {
  if (session.metadata?.purpose !== "appointment_payment") {
    return null;
  }

  const appointmentId = session.metadata.appointment_id;
  if (!appointmentId) {
    throw new ApiError(400, "Sessao sem agendamento.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,user_id,service_id,payment_amount_cents,payment_status,services(price_cents)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !appointment) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const expectedAmount = appointment.payment_amount_cents || service?.price_cents || 0;
  const stripeAmount = session.amount_total ?? 0;

  if (session.payment_status === "paid" && expectedAmount > 0 && stripeAmount !== expectedAmount) {
    logSecureEvent({
      level: "error",
      event: "stripe_appointment_amount_mismatch",
      route: "stripe_payment_sync",
      appointmentId,
    });
    throw new ApiError(409, "Valor do pagamento nao confere.");
  }

  const paymentStatus = mapCheckoutPaymentStatus(session);
  const paymentIntentId = normalizeStripeId(session.payment_intent);
  const paidAt = paymentStatus === "paid" ? new Date().toISOString() : null;

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      payment_method: "online",
      payment_status: paymentStatus,
      payment_amount_cents: expectedAmount,
      payment_currency: (session.currency ?? "brl").toLowerCase(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: paidAt,
    })
    .eq("id", appointmentId);

  if (updateError) {
    throw new ApiError(500, "Nao foi possivel atualizar o pagamento.");
  }

  await supabase.from("payment_records").upsert(
    {
      appointment_id: appointmentId,
      profile_id: appointment.user_id,
      provider: "stripe",
      provider_reference: session.id,
      amount_cents: expectedAmount,
      currency: (session.currency ?? "brl").toLowerCase(),
      status: mapPaymentRecordStatus(session),
      metadata: sanitizePaymentMetadata(session, paymentIntentId),
    },
    { onConflict: "provider,provider_reference" },
  );

  return { appointmentId, paymentStatus };
}

function mapCheckoutPaymentStatus(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") return "paid";
  if (session.status === "expired") return "failed";
  return "pending";
}

function mapPaymentRecordStatus(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") return "paid";
  if (session.status === "expired") return "cancelled";
  return "pending";
}

function normalizeStripeId(value: string | Stripe.PaymentIntent | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function sanitizePaymentMetadata(session: Stripe.Checkout.Session, paymentIntentId: string | null): Json {
  return {
    checkout_session_id: session.id,
    payment_intent_id: paymentIntentId,
    payment_status: session.payment_status,
    checkout_status: session.status,
    amount_total: session.amount_total,
    currency: session.currency,
  };
}

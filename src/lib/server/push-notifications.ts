import "server-only";

import type { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { isWebPushConfigured, sendWebPushNotification } from "@/integrations/push/web-push";
import { safeOperationalError } from "@/lib/server/logging";
import { notificationTemplates } from "@/lib/server/notifications";
import type { Json } from "@/types/database";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

type AppointmentInput = {
  id: string;
  user_id: string | null;
  customer_name: string;
  starts_at: string;
  services?: { name: string } | null;
  barbers?: { name: string } | null;
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  renotify: boolean;
};

export async function sendOperationalPushNotifications(
  supabase: SupabaseAdmin,
  template: string,
  appointment: AppointmentInput,
  siteUrl: string,
) {
  if (!isWebPushConfigured() || !appointment.user_id) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const payload = buildPushPayload(template, appointment, siteUrl);
  if (!payload) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const { data: existingSentPush, error: existingSentPushError } = await supabase
    .from("notifications")
    .select("id")
    .eq("appointment_id", appointment.id)
    .eq("channel", "push")
    .eq("status", "sent")
    .contains("payload", { template })
    .limit(1);

  if (existingSentPushError) {
    throw existingSentPushError;
  }

  if (existingSentPush?.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const [{ data: preferences }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    supabase
      .from("client_preferences")
      .select("push_booking_updates")
      .eq("user_id", appointment.user_id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh_key,auth_key,is_active")
      .eq("user_id", appointment.user_id)
      .eq("is_active", true),
  ]);

  if (subscriptionsError || !preferences?.push_booking_updates || !subscriptions?.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        },
        payload,
      );

      sent += 1;
      await supabase
        .from("push_subscriptions")
        .update({
          last_seen_at: new Date().toISOString(),
          last_sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", subscription.id);

      await recordPushNotification(supabase, {
        appointmentId: appointment.id,
        subscriptionId: subscription.id,
        status: "sent",
        payload: { template, tag: payload.tag, title: payload.title },
      });
    } catch (error) {
      failed += 1;
      const safeError = safeOperationalError(error, "Falha ao enviar push.");
      const statusCode = readPushStatusCode(error);

      await supabase
        .from("push_subscriptions")
        .update({
          is_active: statusCode === 404 || statusCode === 410 ? false : true,
          last_seen_at: new Date().toISOString(),
          last_error: safeError,
        })
        .eq("id", subscription.id);

      await recordPushNotification(supabase, {
        appointmentId: appointment.id,
        subscriptionId: subscription.id,
        status: "failed",
        payload: { template, tag: payload.tag, title: payload.title },
        errorMessage: safeError,
      });
    }
  }

  return { sent, failed, skipped: false };
}

function buildPushPayload(
  template: string,
  appointment: AppointmentInput,
  siteUrl: string,
): PushPayload | null {
  if (
    template !== notificationTemplates.reminder24h &&
    template !== notificationTemplates.reminder2h &&
    template !== notificationTemplates.cancellation &&
    template !== notificationTemplates.reschedule
  ) {
    return null;
  }

  const serviceName = appointment.services?.name ?? "Seu atendimento";
  const barberName = appointment.barbers?.name ?? "barbeiro";
  const startsAt = formatDateTime(appointment.starts_at);
  const url = new URL("/meus-agendamentos", siteUrl).toString();

  if (template === notificationTemplates.reminder24h) {
    return {
      title: "Seu horario e amanha",
      body: `${serviceName} com ${barberName} em ${startsAt}.`,
      url,
      tag: `appointment-${appointment.id}-reminder-24h`,
      renotify: false,
    };
  }

  if (template === notificationTemplates.reminder2h) {
    return {
      title: "Faltam 2 horas para o seu horario",
      body: `${serviceName} com ${barberName} em ${startsAt}.`,
      url,
      tag: `appointment-${appointment.id}-reminder-2h`,
      renotify: true,
    };
  }

  if (template === notificationTemplates.cancellation) {
    return {
      title: "Horario cancelado",
      body: `${serviceName} foi cancelado. Abra sua agenda para remarcar quando quiser.`,
      url,
      tag: `appointment-${appointment.id}-cancelled`,
      renotify: true,
    };
  }

  return {
    title: "Horario reagendado",
    body: `Novo horario: ${serviceName} com ${barberName} em ${startsAt}.`,
    url,
    tag: `appointment-${appointment.id}-rescheduled`,
    renotify: true,
  };
}

async function recordPushNotification(
  supabase: SupabaseAdmin,
  input: {
    appointmentId: string;
    subscriptionId: string;
    status: "sent" | "failed";
    payload: Json;
    errorMessage?: string;
  },
) {
  await supabase.from("notifications").insert({
    appointment_id: input.appointmentId,
    channel: "push",
    destination: `push:${input.subscriptionId}`,
    status: input.status,
    payload: input.payload,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
    error_message: input.errorMessage ?? null,
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function readPushStatusCode(error: unknown) {
  if (typeof error === "object" && error && "statusCode" in error) {
    const statusCode = Reflect.get(error, "statusCode");
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }

  return null;
}

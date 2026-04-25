import { type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import {
  sendAppointmentCancellationEmail,
  sendAppointmentReminderEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentReviewRequestEmail,
  sendBookingConfirmationEmail,
} from "@/integrations/email/resend";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";
import { notificationTemplates } from "@/lib/server/notifications";
import { sendOperationalPushNotifications } from "@/lib/server/push-notifications";

type NotificationJob = {
  id: string;
  appointment_id: string | null;
  channel: "email" | "whatsapp";
  template: string;
  scheduled_for: string;
  attempts: number;
  appointments?: {
    id: string;
    user_id: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string;
    starts_at: string;
    ends_at: string;
    status: string;
    guest_lookup_code: string | null;
    services?: { name: string } | null;
    barbers?: { name: string } | null;
  } | null;
};

export async function GET(request: NextRequest) {
  return processNotifications(request);
}

export async function POST(request: NextRequest) {
  return processNotifications(request);
}

async function processNotifications(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new ApiError(500, "Cron nao configurado.");
    }

    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new ApiError(401, "Nao autorizado.");
    }

    const supabase = getSupabaseAdminClient();
    const runStartedAt = new Date().toISOString();
    await updateCronHealth(supabase, runStartedAt, "Processando notificacoes.");

    const { data, error } = await supabase
      .from("notification_jobs")
      .select("id,appointment_id,channel,template,scheduled_for,attempts,appointments(id,user_id,customer_name,customer_email,customer_phone,starts_at,ends_at,status,guest_lookup_code,services(name),barbers(name))")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(25);

    if (error) throw error;

    const jobs = (data ?? []) as unknown as NotificationJob[];
    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
      const appointment = job.appointments;
      if (!appointment) {
        await markJob(supabase, job.id, "cancelled", job.attempts);
        continue;
      }

      if (!shouldSendForStatus(job.template, appointment.status)) {
        await markJob(supabase, job.id, "cancelled", job.attempts, "Status nao permite envio.");
        continue;
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

      try {
        await sendOperationalPushNotifications(supabase, job.template, appointment, siteUrl);
      } catch {
        logSecureEvent({
          level: "warn",
          event: "push_notification_send_failed",
          route: "/api/admin/notifications/process",
          request,
          appointmentId: appointment.id,
          detail: job.template,
        });
      }

      if (job.channel !== "email" || !appointment.customer_email) {
        await markJob(supabase, job.id, "cancelled", job.attempts);
        continue;
      }

      try {
        const startsAt = formatDateTime(appointment.starts_at);
        const manageUrl = `${siteUrl}/meus-agendamentos`;
        const result = await sendTemplate(job.template, {
          to: appointment.customer_email,
          customerName: appointment.customer_name,
          serviceName: appointment.services?.name ?? "servico",
          barberName: appointment.barbers?.name ?? "barbeiro",
          startsAt,
          lookupCode: appointment.guest_lookup_code,
          manageUrl,
        });

        await markJob(supabase, job.id, result.skipped ? "cancelled" : "sent", job.attempts);
        if (result.skipped) {
          failed += 1;
        } else {
          sent += 1;
        }
      } catch (error) {
        const safeError = safeOperationalError(error, "Falha ao enviar email.");
        await markJob(
          supabase,
          job.id,
          job.attempts + 1 >= 3 ? "failed" : "queued",
          job.attempts,
          safeError,
        );
        logSecureEvent({
          level: "warn",
          event: "notification_send_failed",
          route: "/api/admin/notifications/process",
          request,
          appointmentId: appointment.id,
          detail: job.template,
        });
        failed += 1;
      }
    }

    await updateCronHealth(supabase, runStartedAt, `processed=${jobs.length};sent=${sent};failed=${failed}`);
    return jsonOk({ processed: jobs.length, sent, failed });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "notification_processor_failed",
      route: "/api/admin/notifications/process",
      request,
      status: error instanceof ApiError ? error.status : 500,
    });
    return jsonError(error);
  }
}

async function sendTemplate(
  template: string,
  input: Parameters<typeof sendBookingConfirmationEmail>[0] & { barberName: string },
) {
  if (template === notificationTemplates.bookingConfirmation) {
    return sendBookingConfirmationEmail(input);
  }

  if (template === notificationTemplates.reminder24h) {
    return sendAppointmentReminderEmail({ ...input, reminderLabel: "24h antes" });
  }

  if (template === notificationTemplates.reminder2h) {
    return sendAppointmentReminderEmail({ ...input, reminderLabel: "2h antes" });
  }

  if (template === notificationTemplates.reviewRequest) {
    return sendAppointmentReviewRequestEmail(input);
  }

  if (template === notificationTemplates.cancellation) {
    return sendAppointmentCancellationEmail(input);
  }

  if (template === notificationTemplates.reschedule) {
    return sendAppointmentRescheduledEmail(input);
  }

  return { skipped: true };
}

function shouldSendForStatus(template: string, status: string) {
  if (template === notificationTemplates.cancellation) {
    return status === "cancelled";
  }

  if (template === notificationTemplates.reviewRequest) {
    return status === "completed";
  }

  if (template === notificationTemplates.reminder24h || template === notificationTemplates.reminder2h) {
    return ["pending", "confirmed"].includes(status);
  }

  return true;
}

async function markJob(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  id: string,
  status: "sent" | "failed" | "queued" | "cancelled",
  attempts: number,
  lastError?: string,
) {
  await supabase
    .from("notification_jobs")
    .update({
      status,
      attempts: attempts + 1,
      last_error: lastError ?? null,
    })
    .eq("id", id);
}

async function updateCronHealth(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  ranAt: string,
  result: string,
) {
  await supabase
    .from("business_settings")
    .update({
      notification_cron_last_run_at: ranAt,
      notification_cron_last_result: result.slice(0, 500),
    })
    .eq("id", true);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

import "server-only";

import type { getSupabaseAdminClient } from "@/integrations/supabase/admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

export const notificationTemplates = {
  bookingConfirmation: "booking_confirmation",
  reminder24h: "appointment_reminder_24h",
  reminder2h: "appointment_reminder_2h",
  reviewRequest: "appointment_review_request",
  cancellation: "appointment_cancelled",
  reschedule: "appointment_rescheduled",
} as const;

const futureLifecycleTemplates = [
  notificationTemplates.reminder24h,
  notificationTemplates.reminder2h,
  notificationTemplates.reviewRequest,
];

export async function scheduleAppointmentLifecycleJobs(
  supabase: SupabaseAdmin,
  appointmentId: string,
  startsAt: string,
  endsAt: string,
) {
  await supabase
    .from("notification_jobs")
    .update({ status: "cancelled", last_error: "Substituido por nova agenda." })
    .eq("appointment_id", appointmentId)
    .eq("status", "queued")
    .in("template", futureLifecycleTemplates);

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const jobs = [
    {
      template: notificationTemplates.reminder24h,
      scheduled_for: new Date(start - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      template: notificationTemplates.reminder2h,
      scheduled_for: new Date(start - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      template: notificationTemplates.reviewRequest,
      scheduled_for: new Date(end + 30 * 60 * 1000).toISOString(),
    },
  ].filter((job) => new Date(job.scheduled_for).getTime() > now);

  if (!jobs.length) return;

  await supabase.from("notification_jobs").insert(
    jobs.map((job) => ({
      appointment_id: appointmentId,
      channel: "email" as const,
      template: job.template,
      scheduled_for: job.scheduled_for,
    })),
  );
}

export async function queueAppointmentEmailJob(
  supabase: SupabaseAdmin,
  appointmentId: string,
  template: string,
  scheduledFor = new Date(),
) {
  await supabase.from("notification_jobs").insert({
    appointment_id: appointmentId,
    channel: "email",
    template,
    scheduled_for: scheduledFor.toISOString(),
  });
}

export async function cancelQueuedLifecycleJobs(
  supabase: SupabaseAdmin,
  appointmentId: string,
  reason = "Agendamento cancelado.",
) {
  await supabase
    .from("notification_jobs")
    .update({ status: "cancelled", last_error: reason })
    .eq("appointment_id", appointmentId)
    .eq("status", "queued")
    .in("template", futureLifecycleTemplates);
}

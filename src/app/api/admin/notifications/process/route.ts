import { type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { sendAppointmentReminderEmail, sendBookingConfirmationEmail } from "@/integrations/email/resend";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api";

type NotificationJob = {
  id: string;
  appointment_id: string | null;
  channel: "email" | "whatsapp";
  template: string;
  scheduled_for: string;
  attempts: number;
  appointments?: {
    id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string;
    starts_at: string;
    guest_lookup_code: string;
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
    const { data, error } = await supabase
      .from("notification_jobs")
      .select("id,appointment_id,channel,template,scheduled_for,attempts,appointments(id,customer_name,customer_email,customer_phone,starts_at,guest_lookup_code,services(name),barbers(name))")
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
      if (!appointment || job.channel !== "email" || !appointment.customer_email) {
        await markJob(supabase, job.id, "cancelled", job.attempts);
        continue;
      }

      try {
        const manageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin}/meus-agendamentos?code=${appointment.guest_lookup_code}`;
        const startsAt = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(new Date(appointment.starts_at));
        const result = job.template === "booking_confirmation"
          ? await sendBookingConfirmationEmail({
              to: appointment.customer_email,
              customerName: appointment.customer_name,
              serviceName: appointment.services?.name ?? "servico",
              startsAt,
              lookupCode: appointment.guest_lookup_code,
              manageUrl,
            })
          : await sendAppointmentReminderEmail({
              to: appointment.customer_email,
              customerName: appointment.customer_name,
              serviceName: appointment.services?.name ?? "servico",
              barberName: appointment.barbers?.name ?? "barbeiro",
              startsAt,
              manageUrl,
            });

        await markJob(supabase, job.id, result.skipped ? "cancelled" : "sent", job.attempts);
        if (result.skipped) {
          failed += 1;
        } else {
          sent += 1;
        }
      } catch (error) {
        await markJob(
          supabase,
          job.id,
          job.attempts + 1 >= 3 ? "failed" : "queued",
          job.attempts,
          error instanceof Error ? error.message : "Erro ao enviar lembrete.",
        );
        failed += 1;
      }
    }

    return jsonOk({ processed: jobs.length, sent, failed });
  } catch (error) {
    return jsonError(error);
  }
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

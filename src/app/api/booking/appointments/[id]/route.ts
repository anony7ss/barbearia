import { type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { getAppointmentPolicy } from "@/lib/appointment-policy";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { getAvailabilityForRequest } from "@/lib/server/booking";
import { readGuestAccessToken } from "@/lib/server/guest-access";
import { logSecureEvent } from "@/lib/server/logging";
import {
  cancelQueuedLifecycleJobs,
  notificationTemplates,
  queueAppointmentEmailJob,
  scheduleAppointmentLifecycleJobs,
} from "@/lib/server/notifications";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyTokenHash } from "@/lib/server/tokens";
import { parseUuidParam } from "@/lib/server/validation";

const mutationSchema = z.object({
  token: z.string().min(24).optional(),
  startsAt: z.string().datetime().optional(),
  reason: z.string().trim().max(240).optional(),
}).strict();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const token = readGuestAccessToken(request, id, request.nextUrl.searchParams.get("token"));
    await authorizeAppointment(id, token);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("id,service_id,barber_id,starts_at,ends_at,status,customer_name,customer_email,customer_phone,services(name,price_cents,duration_minutes),barbers(name)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    const settings = await getPolicySettings();
    return jsonOk({
      appointment: {
        ...data,
        policy: getAppointmentPolicy(data, settings),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const body = await parseJson(request, mutationSchema);
    if (!body.startsAt) {
      throw new ApiError(400, "Novo horario obrigatorio.");
    }

    await enforceRateLimit(getClientFingerprint(request), `appointment_reschedule:${id}`, 6, 60);
    const supabase = getSupabaseAdminClient();
    const appointment = await authorizeAppointment(id, readGuestAccessToken(request, id, body.token));
    await assertAppointmentAction(appointment, "reschedule");
    const slots = await getAvailabilityForRequest({
      serviceId: appointment.service_id,
      barberId: appointment.barber_id,
      date: body.startsAt.slice(0, 10),
      excludeAppointmentId: appointment.id,
    });
    const selected = slots.find((slot) => slot.startsAt === body.startsAt);

    if (!selected) {
      throw new ApiError(409, "Horario indisponivel.");
    }

    const { data: updated, error } = await supabase
      .from("appointments")
      .update({ starts_at: selected.startsAt, ends_at: selected.endsAt, status: "confirmed" })
      .eq("id", id)
      .select("id,starts_at,ends_at,customer_email")
      .single();

    if (error || !updated) {
      throw new ApiError(409, "Nao foi possivel reagendar.");
    }

    await scheduleAppointmentLifecycleJobs(supabase, updated.id, updated.starts_at, updated.ends_at);
    if (updated.customer_email) {
      await queueAppointmentEmailJob(supabase, updated.id, notificationTemplates.reschedule);
    }
    logSecureEvent({
      event: "customer_appointment_reschedule",
      route: "/api/booking/appointments/[id]",
      request,
      appointmentId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const parsedBody = mutationSchema.partial().safeParse(await request.json().catch(() => ({})));
    if (!parsedBody.success) {
      throw new ApiError(400, "Dados invalidos.");
    }
    const body = parsedBody.data;
    const supabase = getSupabaseAdminClient();
    await enforceRateLimit(getClientFingerprint(request), `appointment_cancel:${id}`, 6, 60);
    const appointment = await authorizeAppointment(id, readGuestAccessToken(request, id, body.token));
    await assertAppointmentAction(appointment, "cancel");
    const { data: updated, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancel_reason: body.reason ?? null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,customer_email")
      .single();

    if (error || !updated) {
      throw new ApiError(400, "Nao foi possivel cancelar.");
    }

    await cancelQueuedLifecycleJobs(supabase, updated.id);
    if (updated.customer_email) {
      await queueAppointmentEmailJob(supabase, updated.id, notificationTemplates.cancellation);
    }
    logSecureEvent({
      event: "customer_appointment_cancel",
      route: "/api/booking/appointments/[id]",
      request,
      appointmentId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function authorizeAppointment(id: string, token?: string) {
  const supabase = getSupabaseAdminClient();
  const { user } = await getAuthenticatedUser();
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,user_id,service_id,barber_id,starts_at,status,guest_access_token_hash")
    .eq("id", id)
    .maybeSingle();

  if (error || !appointment) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  const ownsAppointment = user && appointment.user_id === user.id;
  const tokenMatches = token && verifyTokenHash(token, appointment.guest_access_token_hash);

  if (!ownsAppointment && !tokenMatches) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  return appointment;
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

async function assertAppointmentAction(
  appointment: { starts_at: string; status: string },
  action: "cancel" | "reschedule",
) {
  const settings = await getPolicySettings();
  const policy = getAppointmentPolicy(appointment, settings);
  const allowed = action === "cancel" ? policy.canCancel : policy.canReschedule;
  const reason = action === "cancel" ? policy.cancelReason : policy.rescheduleReason;

  if (!allowed) {
    throw new ApiError(409, reason ?? "Acao nao permitida para este agendamento.");
  }
}

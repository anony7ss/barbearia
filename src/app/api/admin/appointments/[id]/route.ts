import { type NextRequest } from "next/server";
import { appointmentAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { getAvailabilityForRequest } from "@/lib/server/booking";
import { logSecureEvent } from "@/lib/server/logging";
import { awardCompletedAppointmentPoints } from "@/lib/server/loyalty";
import {
  cancelQueuedLifecycleJobs,
  notificationTemplates,
  queueAppointmentEmailJob,
  scheduleAppointmentLifecycleJobs,
} from "@/lib/server/notifications";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const { supabase, user } = await requireAdmin();
    const body = await parseJson(request, appointmentAdminSchema.partial());
    const { data: current, error: currentError } = await supabase
      .from("appointments")
      .select("*,services(duration_minutes,buffer_minutes)")
      .eq("id", id)
      .maybeSingle();

    if (currentError || !current) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    const nextServiceId = body.service_id ?? current.service_id;
    const nextBarberId = body.barber_id ?? current.barber_id;
    const nextStartsAt = body.starts_at ?? current.starts_at;
    const nextStatus = body.status ?? current.status;
    let nextEndsAt = body.ends_at ?? current.ends_at;
    const changedTiming =
      nextServiceId !== current.service_id ||
      nextBarberId !== current.barber_id ||
      nextStartsAt !== current.starts_at;

    if (changedTiming && ["pending", "confirmed"].includes(nextStatus)) {
      const slots = await getAvailabilityForRequest({
        serviceId: nextServiceId,
        barberId: nextBarberId,
        date: nextStartsAt.slice(0, 10),
        excludeAppointmentId: id,
      });
      const selected = slots.find((slot) => slot.startsAt === nextStartsAt && slot.barberId === nextBarberId);

      if (!selected) {
        throw new ApiError(409, "Horario indisponivel.");
      }

      nextEndsAt = selected.endsAt;
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        ...body,
        ...(changedTiming ? {
          service_id: nextServiceId,
          barber_id: nextBarberId,
          starts_at: nextStartsAt,
          ends_at: nextEndsAt,
        } : {}),
        customer_email: body.customer_email === "" ? null : body.customer_email,
        notes: body.notes === "" ? null : body.notes,
        internal_notes: body.internal_notes === "" ? null : body.internal_notes,
        cancelled_at: nextStatus === "cancelled" && current.status !== "cancelled"
          ? new Date().toISOString()
          : body.status && body.status !== "cancelled"
            ? null
            : current.cancelled_at,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    if (current.status !== "completed" && data.status === "completed") {
      await awardCompletedAppointmentPoints(supabase, {
        profileId: data.user_id,
        appointmentId: data.id,
        actorId: user.id,
      });
      if (data.customer_email) {
        await queueAppointmentEmailJob(
          supabase,
          data.id,
          notificationTemplates.reviewRequest,
          new Date(Date.now() + 30 * 60 * 1000),
        );
      }
    }

    if (changedTiming && ["pending", "confirmed"].includes(data.status)) {
      await scheduleAppointmentLifecycleJobs(supabase, data.id, data.starts_at, data.ends_at);
      if (data.customer_email) {
        await queueAppointmentEmailJob(supabase, data.id, notificationTemplates.reschedule);
      }
    }

    if (current.status !== "cancelled" && data.status === "cancelled") {
      await cancelQueuedLifecycleJobs(supabase, data.id);
      if (data.customer_email) {
        await queueAppointmentEmailJob(supabase, data.id, notificationTemplates.cancellation);
      }
    }

    if (current.status !== "no_show" && data.status === "no_show") {
      await cancelQueuedLifecycleJobs(supabase, data.id, "Cliente marcado como no-show.");
    }
    logSecureEvent({
      event: "admin_appointment_update",
      route: "/api/admin/appointments/[id]",
      request,
      actorId: user.id,
      appointmentId: data.id,
      detail: `status=${data.status}`,
    });
    return jsonOk({ appointment: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const { supabase, user } = await requireAdmin();
    const { data: current } = await supabase
      .from("appointments")
      .select("id,customer_email,status")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    await cancelQueuedLifecycleJobs(supabase, id);
    if (current?.customer_email && current.status !== "cancelled") {
      await queueAppointmentEmailJob(supabase, id, notificationTemplates.cancellation);
    }
    logSecureEvent({
      event: "admin_appointment_cancel",
      route: "/api/admin/appointments/[id]",
      request,
      actorId: user.id,
      appointmentId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

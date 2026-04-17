import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireBarber } from "@/lib/server/auth";
import { logSecureEvent } from "@/lib/server/logging";
import { awardCompletedAppointmentPoints } from "@/lib/server/loyalty";
import {
  cancelQueuedLifecycleJobs,
  notificationTemplates,
  queueAppointmentEmailJob,
} from "@/lib/server/notifications";
import { parseUuidParam } from "@/lib/server/validation";

const barberAppointmentUpdateSchema = z.object({
  status: z.enum(["confirmed", "completed", "no_show"]).optional(),
  internal_notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const { supabase, user, barber } = await requireBarber();
    const body = await parseJson(request, barberAppointmentUpdateSchema);

    const { data: current, error: currentError } = await supabase
      .from("appointments")
      .select("id,barber_id,status,user_id,customer_email,internal_notes")
      .eq("id", id)
      .eq("barber_id", barber.id)
      .maybeSingle();

    if (currentError || !current) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    const update: {
      status?: "confirmed" | "completed" | "no_show";
      internal_notes?: string | null;
    } = {};

    if (body.status) {
      update.status = body.status;
    }

    if (body.internal_notes !== undefined) {
      update.internal_notes = body.internal_notes === "" ? null : body.internal_notes;
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(update)
      .eq("id", id)
      .eq("barber_id", barber.id)
      .select("id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,internal_notes,notes,services(name,duration_minutes),barbers(name)")
      .single();

    if (error) throw error;

    if (current.status !== "completed" && data.status === "completed") {
      await awardCompletedAppointmentPoints(supabase, {
        profileId: current.user_id,
        appointmentId: data.id,
        actorId: user.id,
      });

      if (current.customer_email) {
        await queueAppointmentEmailJob(
          supabase,
          data.id,
          notificationTemplates.reviewRequest,
          new Date(Date.now() + 30 * 60 * 1000),
        );
      }
    }

    if (current.status !== "no_show" && data.status === "no_show") {
      await cancelQueuedLifecycleJobs(supabase, data.id, "Atendimento marcado como no-show pelo barbeiro.");
    }

    logSecureEvent({
      event: "barber_appointment_update",
      route: "/api/barber/appointments/[id]",
      request,
      actorId: user.id,
      appointmentId: data.id,
      detail: `status=${data.status};note=${body.internal_notes !== undefined}`,
    });

    return jsonOk({ appointment: data });
  } catch (error) {
    return jsonError(error);
  }
}

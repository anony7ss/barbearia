import { type NextRequest } from "next/server";
import { appointmentAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { getAvailabilityForRequest } from "@/lib/server/booking";
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
    if (current.status !== "completed" && data.status === "completed" && data.user_id) {
      await awardLoyaltyPoints(supabase, data.user_id, data.id, user.id);
    }
    return jsonOk({ appointment: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Agendamento nao encontrado.");
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function awardLoyaltyPoints(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  profileId: string,
  appointmentId: string,
  actorId: string,
) {
  const { data: existing } = await supabase
    .from("loyalty_events")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("reason", "completed_appointment")
    .maybeSingle();

  if (existing) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("loyalty_points")
    .eq("id", profileId)
    .maybeSingle();

  const points = 10;
  await supabase
    .from("profiles")
    .update({ loyalty_points: (profile?.loyalty_points ?? 0) + points })
    .eq("id", profileId);

  await supabase.from("loyalty_events").insert({
    profile_id: profileId,
    appointment_id: appointmentId,
    points_delta: points,
    reason: "completed_appointment",
    created_by: actorId,
  });
}

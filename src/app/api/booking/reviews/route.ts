import { type NextRequest } from "next/server";
import { appointmentReviewSchema } from "@/features/reviews/schemas";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { readGuestAccessToken } from "@/lib/server/guest-access";
import { logSecureEvent } from "@/lib/server/logging";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyTokenHash } from "@/lib/server/tokens";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "appointment_review", 10, 60);
    const body = await parseJson(request, appointmentReviewSchema);
    await enforceRateLimit(body.appointmentId, "appointment_review_target", 3, 3600);

    const supabase = getSupabaseAdminClient();
    const { user } = await getAuthenticatedUser();
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id,user_id,barber_id,service_id,status,customer_name,guest_access_token_hash")
      .eq("id", body.appointmentId)
      .maybeSingle();

    if (error || !appointment) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    const token = readGuestAccessToken(request, appointment.id, body.token);
    const ownsAppointment = Boolean(user && appointment.user_id === user.id);
    const tokenMatches = Boolean(
      token &&
        appointment.guest_access_token_hash &&
        verifyTokenHash(token, appointment.guest_access_token_hash),
    );

    if (!ownsAppointment && !tokenMatches) {
      throw new ApiError(404, "Agendamento nao encontrado.");
    }

    if (appointment.status !== "completed") {
      throw new ApiError(409, "A avaliacao fica disponivel apos o atendimento ser concluido.");
    }

    const { data: existingReview } = await supabase
      .from("appointment_reviews")
      .select("id")
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (existingReview) {
      throw new ApiError(409, "Este atendimento ja foi avaliado.");
    }

    const { data: review, error: insertError } = await supabase
      .from("appointment_reviews")
      .insert({
        appointment_id: appointment.id,
        profile_id: ownsAppointment ? user?.id ?? null : appointment.user_id,
        barber_id: appointment.barber_id,
        service_id: appointment.service_id,
        customer_name: appointment.customer_name,
        rating: body.rating,
        comment: body.comment,
        is_public: body.isPublic,
      })
      .select("id,appointment_id,rating,comment,is_public,created_at")
      .single();

    if (insertError || !review) {
      throw new ApiError(409, "Nao foi possivel salvar a avaliacao.");
    }

    logSecureEvent({
      event: "appointment_review_created",
      route: "/api/booking/reviews",
      request,
      actorId: user?.id ?? null,
      appointmentId: appointment.id,
    });

    return jsonOk({ review });
  } catch (error) {
    return jsonError(error);
  }
}

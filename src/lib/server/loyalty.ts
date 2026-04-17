import "server-only";

import type { getSupabaseAdminClient } from "@/integrations/supabase/admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

export async function awardCompletedAppointmentPoints(
  supabase: SupabaseAdmin,
  input: {
    profileId: string | null;
    appointmentId: string;
    actorId: string | null;
  },
) {
  if (!input.profileId) return;

  const { data: existing } = await supabase
    .from("loyalty_events")
    .select("id")
    .eq("appointment_id", input.appointmentId)
    .eq("reason", "completed_appointment")
    .maybeSingle();

  if (existing) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("loyalty_points")
    .eq("id", input.profileId)
    .maybeSingle();

  const points = 10;
  await supabase
    .from("profiles")
    .update({ loyalty_points: (profile?.loyalty_points ?? 0) + points })
    .eq("id", input.profileId);

  await supabase.from("loyalty_events").insert({
    profile_id: input.profileId,
    appointment_id: input.appointmentId,
    points_delta: points,
    reason: "completed_appointment",
    created_by: input.actorId,
  });
}

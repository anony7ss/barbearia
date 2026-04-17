import "server-only";

import { computeAvailableSlots, type AvailabilityRule } from "@/features/booking/availability";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError } from "@/lib/server/api";

export async function getAvailabilityForRequest(input: {
  serviceId: string;
  barberId?: string;
  date: string;
  excludeAppointmentId?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const dayStart = new Date(`${input.date}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: service }, { data: settings }, { data: barbers }, { data: rules }, { data: appointments }, { data: blocks }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id,duration_minutes,buffer_minutes")
        .eq("id", input.serviceId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("business_settings")
        .select("timezone,min_notice_minutes,max_advance_days,slot_interval_minutes,default_buffer_minutes")
        .eq("id", true)
        .maybeSingle(),
      supabase
        .from("barbers")
        .select("id,name")
        .eq("is_active", true)
        .order("display_order"),
      supabase.from("availability_rules").select("barber_id,weekday,start_time,end_time,break_start,break_end").eq("is_active", true),
      supabase
        .from("appointments")
        .select("id,barber_id,starts_at,ends_at")
        .in("status", ["pending", "confirmed"])
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString()),
      supabase
        .from("blocked_slots")
        .select("barber_id,starts_at,ends_at")
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString()),
    ]);

  if (!service || !settings || !barbers?.length) {
    throw new ApiError(404, "Agenda nao configurada.");
  }

  return computeAvailableSlots({
    date: input.date,
    service,
    barbers,
    rules: (rules ?? []) as AvailabilityRule[],
    busySlots: [
      ...((appointments ?? []).filter((appointment) => appointment.id !== input.excludeAppointmentId)),
      ...(blocks ?? []),
    ],
    settings,
    requestedBarberId: input.barberId && input.barberId !== "any" ? input.barberId : null,
  });
}

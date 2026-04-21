import "server-only";

import { computeAvailableSlots, type AvailabilityRule, type AvailableSlot } from "@/features/booking/availability";
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

  const requestedBarberId = input.barberId && input.barberId !== "any" ? input.barberId : null;
  const slots = computeAvailableSlots({
    date: input.date,
    service,
    barbers,
    rules: (rules ?? []) as AvailabilityRule[],
    busySlots: [
      ...((appointments ?? []).filter((appointment) => appointment.id !== input.excludeAppointmentId)),
      ...(blocks ?? []),
    ],
    settings,
    requestedBarberId,
  });

  return requestedBarberId ? slots : collapseAnyBarberSlots(slots);
}

function collapseAnyBarberSlots(slots: AvailableSlot[]) {
  const grouped = new Map<string, AvailableSlot[]>();

  for (const slot of slots) {
    const group = grouped.get(slot.startsAt);
    if (group) {
      group.push(slot);
    } else {
      grouped.set(slot.startsAt, [slot]);
    }
  }

  return Array.from(grouped.values()).map((sameTimeSlots) => {
    const selectedIndex = stableSlotIndex(sameTimeSlots[0].startsAt, sameTimeSlots.length);
    return sameTimeSlots[selectedIndex] ?? sameTimeSlots[0];
  });
}

function stableSlotIndex(value: string, length: number) {
  if (length <= 1) return 0;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % length;
}

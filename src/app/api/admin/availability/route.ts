import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

const availabilityMutationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("blocked_slot"),
    barber_id: z.string().uuid().nullable().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    reason: z.string().trim().max(180).optional(),
  }).strict(),
  z.object({
    type: z.literal("rule"),
    barber_id: z.string().uuid().nullable().optional(),
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    break_start: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    break_end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  }).strict(),
]);

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const [{ data: settings }, { data: rules }, { data: blocks }] = await Promise.all([
      supabase.from("business_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("availability_rules").select("*,barbers(name)").order("weekday"),
      supabase.from("blocked_slots").select("*,barbers(name)").gte("ends_at", new Date().toISOString()).order("starts_at"),
    ]);

    return jsonOk({ settings, rules, blocks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await parseJson(request, availabilityMutationSchema);

    if (body.type === "blocked_slot") {
      if (new Date(body.starts_at).getTime() >= new Date(body.ends_at).getTime()) {
        throw new ApiError(400, "Periodo invalido.");
      }

      const { data, error } = await supabase
        .from("blocked_slots")
        .insert({
          barber_id: body.barber_id ?? null,
          starts_at: body.starts_at,
          ends_at: body.ends_at,
          reason: body.reason ?? null,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (error) throw error;
      return jsonOk({ block: data }, { status: 201 });
    }

    if (timeToMinutes(body.start_time) >= timeToMinutes(body.end_time)) {
      throw new ApiError(400, "Horario invalido.");
    }

    if ((body.break_start && !body.break_end) || (!body.break_start && body.break_end)) {
      throw new ApiError(400, "Intervalo incompleto.");
    }

    if (body.break_start && body.break_end && timeToMinutes(body.break_start) >= timeToMinutes(body.break_end)) {
      throw new ApiError(400, "Intervalo invalido.");
    }

    const { data, error } = await supabase
      .from("availability_rules")
      .insert({
        barber_id: body.barber_id ?? null,
        weekday: body.weekday,
        start_time: body.start_time,
        end_time: body.end_time,
        break_start: body.break_start || null,
        break_end: body.break_end || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return jsonOk({ rule: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

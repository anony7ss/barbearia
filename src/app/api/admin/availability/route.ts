import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const ruleFieldsSchema = z.object({
  barber_id: z.string().uuid().nullable().optional(),
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: timeSchema,
  end_time: timeSchema,
  break_start: timeSchema.optional().or(z.literal("")),
  break_end: timeSchema.optional().or(z.literal("")),
});

const blockFieldsSchema = z.object({
  barber_id: z.string().uuid().nullable().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  reason: z.string().trim().max(180).optional(),
});

const availabilityMutationSchema = z.discriminatedUnion("type", [
  blockFieldsSchema.extend({
    type: z.literal("blocked_slot"),
  }).strict(),
  ruleFieldsSchema.extend({
    type: z.literal("rule"),
  }).strict(),
]);

const availabilityPatchSchema = z.discriminatedUnion("type", [
  ruleFieldsSchema.extend({
    type: z.literal("rule"),
    id: z.string().uuid(),
  }).strict(),
  blockFieldsSchema.extend({
    type: z.literal("blocked_slot"),
    id: z.string().uuid(),
  }).strict(),
]);

const availabilityDeleteSchema = z.object({
  type: z.literal("blocked_slot"),
  id: z.string().uuid(),
}).strict();

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

    validateRuleTimes(body);

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

export async function PATCH(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, availabilityPatchSchema);

    if (body.type === "blocked_slot") {
      if (new Date(body.starts_at).getTime() >= new Date(body.ends_at).getTime()) {
        throw new ApiError(400, "Periodo invalido.");
      }

      const { data, error } = await supabase
        .from("blocked_slots")
        .update({
          barber_id: body.barber_id ?? null,
          starts_at: body.starts_at,
          ends_at: body.ends_at,
          reason: body.reason || null,
        })
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) throw error;
      return jsonOk({ block: data });
    }

    validateRuleTimes(body);

    const { data, error } = await supabase
      .from("availability_rules")
      .update({
        barber_id: body.barber_id ?? null,
        weekday: body.weekday,
        start_time: body.start_time,
        end_time: body.end_time,
        break_start: body.break_start || null,
        break_end: body.break_end || null,
      })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw error;
    return jsonOk({ rule: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, availabilityDeleteSchema);

    const { data, error } = await supabase
      .from("blocked_slots")
      .delete()
      .eq("id", body.id)
      .select("id")
      .single();

    if (error) throw error;
    return jsonOk({ id: data.id });
  } catch (error) {
    return jsonError(error);
  }
}

function validateRuleTimes(body: {
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
}) {
  if (timeToMinutes(body.start_time) >= timeToMinutes(body.end_time)) {
    throw new ApiError(400, "Horario invalido.");
  }

  if ((body.break_start && !body.break_end) || (!body.break_start && body.break_end)) {
    throw new ApiError(400, "Intervalo incompleto.");
  }

  if (body.break_start && body.break_end && timeToMinutes(body.break_start) >= timeToMinutes(body.break_end)) {
    throw new ApiError(400, "Intervalo invalido.");
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

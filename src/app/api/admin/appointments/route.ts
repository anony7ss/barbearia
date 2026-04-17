import { type NextRequest } from "next/server";
import { z } from "zod";
import { appointmentAdminSchema } from "@/features/admin/schemas";
import { createAccessToken, createLookupCode, hashToken } from "@/lib/server/tokens";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { getAvailabilityForRequest } from "@/lib/server/booking";
import type { AppointmentStatus } from "@/types/database";

const appointmentsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const parsedQuery = appointmentsQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    });
    if (!parsedQuery.success) {
      throw new ApiError(400, "Filtros invalidos.");
    }

    const { status, from, to } = parsedQuery.data;
    let query = supabase
      .from("appointments")
      .select("*,services(name,price_cents,duration_minutes),barbers(name)")
      .order("starts_at", { ascending: true });

    if (status) query = query.eq("status", status as AppointmentStatus);
    if (from) query = query.gte("starts_at", from);
    if (to) query = query.lte("starts_at", to);

    const { data, error } = await query;
    if (error) throw error;
    return jsonOk({ appointments: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, appointmentAdminSchema);
    const slots = await getAvailabilityForRequest({
      serviceId: body.service_id,
      barberId: body.barber_id,
      date: body.starts_at.slice(0, 10),
    });
    const selected = slots.find(
      (slot) => slot.startsAt === body.starts_at && slot.barberId === body.barber_id,
    );

    if (!selected && ["pending", "confirmed"].includes(body.status)) {
      throw new ApiError(409, "Horario indisponivel.");
    }

    const token = createAccessToken();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        ...body,
        ends_at: selected?.endsAt ?? body.ends_at,
        customer_email: body.customer_email || null,
        notes: body.notes || null,
        internal_notes: body.internal_notes || null,
        guest_lookup_code: createLookupCode(),
        guest_access_token_hash: hashToken(token),
        source: "admin",
      })
      .select("*")
      .single();

    if (error) throw error;
    await scheduleReminderJobs(supabase, data.id, data.starts_at);
    return jsonOk({ appointment: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

async function scheduleReminderJobs(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  appointmentId: string,
  startsAt: string,
) {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  const reminders = [
    { template: "appointment_reminder_24h", scheduled_for: new Date(start - 24 * 60 * 60 * 1000).toISOString() },
    { template: "appointment_reminder_2h", scheduled_for: new Date(start - 2 * 60 * 60 * 1000).toISOString() },
  ].filter((job) => new Date(job.scheduled_for).getTime() > now);

  if (!reminders.length) return;

  await supabase.from("notification_jobs").insert(
    reminders.map((job) => ({
      appointment_id: appointmentId,
      channel: "email" as const,
      template: job.template,
      scheduled_for: job.scheduled_for,
    })),
  );
}

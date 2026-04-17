import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

const exportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const parsedQuery = exportQuerySchema.safeParse({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    });
    if (!parsedQuery.success) {
      throw new ApiError(400, "Filtros invalidos.");
    }

    const { from, to } = parsedQuery.data;
    let query = supabase
      .from("appointments")
      .select("id,starts_at,ends_at,status,customer_name,customer_email,customer_phone,notes,internal_notes,services(name,price_cents),barbers(name)")
      .order("starts_at", { ascending: true });

    if (from) query = query.gte("starts_at", from);
    if (to) query = query.lte("starts_at", to);

    const { data, error } = await query.limit(2000);
    if (error) throw error;

    const rows = [
      ["id", "inicio", "fim", "status", "cliente", "email", "telefone", "servico", "barbeiro", "valor_centavos", "notas", "notas_internas"],
      ...((data ?? []) as unknown as Array<{
        id: string;
        starts_at: string;
        ends_at: string;
        status: string;
        customer_name: string;
        customer_email: string | null;
        customer_phone: string;
        notes: string | null;
        internal_notes: string | null;
        services?: { name: string; price_cents: number } | null;
        barbers?: { name: string } | null;
      }>).map((appointment) => [
        appointment.id,
        appointment.starts_at,
        appointment.ends_at,
        appointment.status,
        appointment.customer_name,
        appointment.customer_email ?? "",
        appointment.customer_phone,
        appointment.services?.name ?? "",
        appointment.barbers?.name ?? "",
        String(appointment.services?.price_cents ?? 0),
        appointment.notes ?? "",
        appointment.internal_notes ?? "",
      ]),
    ];

    return csvResponse(rows, "agendamentos.csv");
  } catch (error) {
    return jsonError(error);
  }
}

function csvResponse(rows: string[][], filename: string) {
  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

import { jsonError } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone,role,loyalty_points,preferred_barber_id,is_active,deleted_at,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const rows = [
      ["id", "nome", "telefone", "perfil", "pontos", "barbeiro_preferido", "ativo", "criado_em"],
      ...((data ?? []) as Array<{
        id: string;
        full_name: string | null;
        phone: string | null;
        role: string;
        loyalty_points: number;
        preferred_barber_id: string | null;
        is_active: boolean;
        created_at: string;
      }>).map((client) => [
        client.id,
        client.full_name ?? "",
        client.phone ?? "",
        client.role,
        String(client.loyalty_points),
        client.preferred_barber_id ?? "",
        client.is_active ? "sim" : "nao",
        client.created_at,
      ]),
    ];

    return csvResponse(rows, "clientes.csv");
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

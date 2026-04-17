import { type NextRequest } from "next/server";
import { serviceAdminSchema } from "@/features/admin/schemas";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Servico nao encontrado.");
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, serviceAdminSchema.partial());
    const { data, error } = await supabase.from("services").update(body).eq("id", id).select("*").single();

    if (error) throw error;
    return jsonOk({ service: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Servico nao encontrado.");
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("services").update({ is_active: false }).eq("id", id);

    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

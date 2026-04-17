import { type NextRequest } from "next/server";
import { barberAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, barberAdminSchema.partial());
    const { data, error } = await supabase.from("barbers").update({
      ...body,
      bio: body.bio === "" ? null : body.bio,
      photo_url: body.photo_url === "" ? null : body.photo_url,
      profile_id: body.profile_id === "" ? null : body.profile_id,
    }).eq("id", id).select("*").single();

    if (error) throw error;
    return jsonOk({ barber: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const { supabase } = await requireAdmin();

    const { count, error: countError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", id);

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      throw new ApiError(409, "Este barbeiro possui agendamentos vinculados. Desative para preservar o historico.");
    }

    const { error } = await supabase.from("barbers").delete().eq("id", id);

    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

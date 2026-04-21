import { type NextRequest } from "next/server";
import { barberAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, barberAdminSchema.partial());
    const { data: current, error: currentError } = await supabase
      .from("barbers")
      .select("id,photo_url,photo_storage_path")
      .eq("id", id)
      .maybeSingle();

    if (currentError || !current) {
      throw new ApiError(404, "Barbeiro nao encontrado.");
    }

    const nextPhotoUrl = body.photo_url === undefined ? undefined : (body.photo_url === "" ? null : body.photo_url);
    const update: Record<string, unknown> = {
      ...body,
      bio: body.bio === undefined ? undefined : (body.bio === "" ? null : body.bio),
      profile_id: body.profile_id === undefined ? undefined : (body.profile_id === "" ? null : body.profile_id),
    };

    if (nextPhotoUrl !== undefined) {
      update.photo_url = nextPhotoUrl;

      if (nextPhotoUrl !== current.photo_url) {
        if (current.photo_storage_path) {
          await getSupabaseAdminClient().storage.from("barbershop-gallery").remove([current.photo_storage_path]);
        }
        update.photo_storage_path = null;
      }
    }

    const { data, error } = await supabase
      .from("barbers")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

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

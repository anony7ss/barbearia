import { type NextRequest } from "next/server";
import { barberAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { GALLERY_BUCKET } from "@/features/barbers/gallery-config";
import { parseUuidParam } from "@/lib/server/validation";
import type { Database } from "@/types/database";

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
    const update: Database["public"]["Tables"]["barbers"]["Update"] = {};

    if (body.name !== undefined) update.name = body.name;
    if (body.slug !== undefined) update.slug = body.slug;
    if (body.specialties !== undefined) update.specialties = body.specialties;
    if (body.is_featured !== undefined) update.is_featured = body.is_featured;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.display_order !== undefined) update.display_order = body.display_order;
    if (body.bio !== undefined) update.bio = body.bio === "" ? null : body.bio;
    if (body.profile_id !== undefined) update.profile_id = body.profile_id === "" ? null : body.profile_id;

    if (nextPhotoUrl !== undefined) {
      update.photo_url = nextPhotoUrl;

      if (nextPhotoUrl !== current.photo_url) {
        if (current.photo_storage_path) {
          await getSupabaseAdminClient().storage.from(GALLERY_BUCKET).remove([current.photo_storage_path]);
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

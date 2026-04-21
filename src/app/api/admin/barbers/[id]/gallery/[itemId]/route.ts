import { type NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { deleteGalleryItem, galleryItemUpdatePayloadSchema, updateGalleryItem } from "@/features/barbers/gallery-server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { parseUuidParam } from "@/lib/server/validation";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id: rawBarberId, itemId: rawItemId } = await context.params;
    const barberId = parseUuidParam(rawBarberId, "Barbeiro nao encontrado.");
    const itemId = parseUuidParam(rawItemId, "Imagem nao encontrada.");
    const auth = await requireAdmin();
    const body = await parseJson(request, galleryItemUpdatePayloadSchema);
    const item = await updateGalleryItem({
      supabase: getSupabaseAdminClient(),
      barberId,
      itemId,
      input: body,
    });

    logSecureEvent({
      event: "admin_barber_gallery_update",
      route: "/api/admin/barbers/[id]/gallery/[itemId]",
      request,
      actorId: auth.user.id,
      detail: `${barberId}:${itemId}`,
    });

    return jsonOk({ item });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_gallery_update_failed",
      route: "/api/admin/barbers/[id]/gallery/[itemId]",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_update_failed"),
    });
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id: rawBarberId, itemId: rawItemId } = await context.params;
    const barberId = parseUuidParam(rawBarberId, "Barbeiro nao encontrado.");
    const itemId = parseUuidParam(rawItemId, "Imagem nao encontrada.");
    const auth = await requireAdmin();

    await deleteGalleryItem({
      supabase: getSupabaseAdminClient(),
      barberId,
      itemId,
    });

    logSecureEvent({
      event: "admin_barber_gallery_delete",
      route: "/api/admin/barbers/[id]/gallery/[itemId]",
      request,
      actorId: auth.user.id,
      detail: `${barberId}:${itemId}`,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_gallery_delete_failed",
      route: "/api/admin/barbers/[id]/gallery/[itemId]",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_delete_failed"),
    });
    return jsonError(error);
  }
}

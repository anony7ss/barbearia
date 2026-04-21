import { type NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireBarber } from "@/lib/server/auth";
import { deleteGalleryItem, galleryItemUpdatePayloadSchema, updateGalleryItem } from "@/features/barbers/gallery-server";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId: rawItemId } = await context.params;
    const itemId = parseUuidParam(rawItemId, "Imagem nao encontrada.");
    const auth = await requireBarber();
    const body = await parseJson(request, galleryItemUpdatePayloadSchema);
    const item = await updateGalleryItem({
      supabase: auth.supabase,
      barberId: auth.barber.id,
      itemId,
      input: body,
    });

    logSecureEvent({
      event: "barber_gallery_update",
      route: "/api/barber/gallery/[itemId]",
      request,
      actorId: auth.user.id,
      detail: `${auth.barber.id}:${itemId}`,
    });

    return jsonOk({ item });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "barber_gallery_update_failed",
      route: "/api/barber/gallery/[itemId]",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_update_failed"),
    });
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId: rawItemId } = await context.params;
    const itemId = parseUuidParam(rawItemId, "Imagem nao encontrada.");
    const auth = await requireBarber();

    await deleteGalleryItem({
      supabase: auth.supabase,
      barberId: auth.barber.id,
      itemId,
    });

    logSecureEvent({
      event: "barber_gallery_delete",
      route: "/api/barber/gallery/[itemId]",
      request,
      actorId: auth.user.id,
      detail: `${auth.barber.id}:${itemId}`,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "barber_gallery_delete_failed",
      route: "/api/barber/gallery/[itemId]",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_delete_failed"),
    });
    return jsonError(error);
  }
}

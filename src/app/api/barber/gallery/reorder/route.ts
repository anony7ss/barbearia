import { type NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireBarber } from "@/lib/server/auth";
import { gallerySortPayloadSchema, reorderGalleryItems } from "@/features/barbers/gallery-server";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBarber();
    const body = await parseJson(request, gallerySortPayloadSchema);
    const items = await reorderGalleryItems({
      supabase: auth.supabase,
      barberId: auth.barber.id,
      input: body,
    });

    logSecureEvent({
      event: "barber_gallery_reorder",
      route: "/api/barber/gallery/reorder",
      request,
      actorId: auth.user.id,
      detail: `${auth.barber.id}:${body.itemIds.length}`,
    });

    return jsonOk({ items });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "barber_gallery_reorder_failed",
      route: "/api/barber/gallery/reorder",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_reorder_failed"),
    });
    return jsonError(error);
  }
}

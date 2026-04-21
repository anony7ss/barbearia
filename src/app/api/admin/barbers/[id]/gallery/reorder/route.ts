import { type NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { gallerySortPayloadSchema, reorderGalleryItems } from "@/features/barbers/gallery-server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { parseUuidParam } from "@/lib/server/validation";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const barberId = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const auth = await requireAdmin();
    const body = await parseJson(request, gallerySortPayloadSchema);
    const items = await reorderGalleryItems({
      supabase: getSupabaseAdminClient(),
      barberId,
      input: body,
    });

    logSecureEvent({
      event: "admin_barber_gallery_reorder",
      route: "/api/admin/barbers/[id]/gallery/reorder",
      request,
      actorId: auth.user.id,
      detail: `${barberId}:${body.itemIds.length}`,
    });

    return jsonOk({ items });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_gallery_reorder_failed",
      route: "/api/admin/barbers/[id]/gallery/reorder",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_reorder_failed"),
    });
    return jsonError(error);
  }
}

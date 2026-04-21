import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { listGalleryItems, uploadGalleryItemFromForm } from "@/features/barbers/gallery-server";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { parseUuidParam } from "@/lib/server/validation";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const barberId = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    await requireAdmin();
    const items = await listGalleryItems(getSupabaseAdminClient(), barberId);
    return jsonOk({ items });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_gallery_list_failed",
      route: "/api/admin/barbers/[id]/gallery",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_list_failed"),
    });
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const barberId = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const auth = await requireAdmin();
    const formData = await request.formData();
    const item = await uploadGalleryItemFromForm({
      supabase: getSupabaseAdminClient(),
      barberId,
      actorId: auth.user.id,
      formData,
    });

    logSecureEvent({
      event: "admin_barber_gallery_upload",
      route: "/api/admin/barbers/[id]/gallery",
      request,
      actorId: auth.user.id,
      detail: `${barberId}:${item.id}`,
    });

    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_gallery_upload_failed",
      route: "/api/admin/barbers/[id]/gallery",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_upload_failed"),
    });
    return jsonError(error);
  }
}

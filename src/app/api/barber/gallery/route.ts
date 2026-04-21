import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/api";
import { requireBarber } from "@/lib/server/auth";
import { listGalleryItems, uploadGalleryItemFromForm } from "@/features/barbers/gallery-server";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBarber();
    const items = await listGalleryItems(auth.supabase, auth.barber.id);
    return jsonOk({ items });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "barber_gallery_list_failed",
      route: "/api/barber/gallery",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_list_failed"),
    });
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBarber();
    const formData = await request.formData();
    const item = await uploadGalleryItemFromForm({
      supabase: auth.supabase,
      barberId: auth.barber.id,
      actorId: auth.user.id,
      formData,
    });

    logSecureEvent({
      event: "barber_gallery_upload",
      route: "/api/barber/gallery",
      request,
      actorId: auth.user.id,
      detail: `${auth.barber.id}:${item.id}`,
    });

    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "barber_gallery_upload_failed",
      route: "/api/barber/gallery",
      request,
      status: 500,
      detail: safeOperationalError(error, "gallery_upload_failed"),
    });
    return jsonError(error);
  }
}

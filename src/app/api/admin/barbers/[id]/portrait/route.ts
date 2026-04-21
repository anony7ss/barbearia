import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { uploadBarberPortrait } from "@/features/barbers/gallery-server";
import { parseUuidParam } from "@/lib/server/validation";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { logSecureEvent, safeOperationalError } from "@/lib/server/logging";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const barberId = parseUuidParam(rawId, "Barbeiro nao encontrado.");
    const auth = await requireAdmin();
    const formData = await request.formData();
    const barber = await uploadBarberPortrait({
      supabase: getSupabaseAdminClient(),
      barberId,
      formData,
    });

    logSecureEvent({
      event: "admin_barber_portrait_upload",
      route: "/api/admin/barbers/[id]/portrait",
      request,
      actorId: auth.user.id,
      detail: barberId,
    });

    return jsonOk({ barber });
  } catch (error) {
    logSecureEvent({
      level: "error",
      event: "admin_barber_portrait_upload_failed",
      route: "/api/admin/barbers/[id]/portrait",
      request,
      status: 500,
      detail: safeOperationalError(error, "upload_failed"),
    });
    return jsonError(error);
  }
}

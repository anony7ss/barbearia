import { type NextRequest } from "next/server";
import { businessSettingsAdminSchema } from "@/features/admin/schemas";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { logSecureEvent } from "@/lib/server/logging";
import { requireAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;
    return jsonOk({ settings: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await parseJson(request, businessSettingsAdminSchema.partial());
    const { data, error } = await supabase
      .from("business_settings")
      .update({
        ...body,
        whatsapp_phone: body.whatsapp_phone === "" ? null : body.whatsapp_phone,
        email: body.email === "" ? null : body.email,
        address: body.address === "" ? null : body.address,
      })
      .eq("id", true)
      .select("*")
      .single();

    if (error) throw error;
    logSecureEvent({
      event: "admin_settings_update",
      route: "/api/admin/settings",
      request,
      actorId: user.id,
    });
    return jsonOk({ settings: data });
  } catch (error) {
    return jsonError(error);
  }
}

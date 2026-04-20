import { type NextRequest } from "next/server";
import { contactMessageAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { logSecureEvent } from "@/lib/server/logging";
import { parseUuidParam } from "@/lib/server/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Mensagem nao encontrada.");
    const { supabase, user } = await requireAdmin();
    const body = await parseJson(request, contactMessageAdminSchema);

    const { data: current, error: currentError } = await supabase
      .from("contact_messages")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!current) {
      throw new ApiError(404, "Mensagem nao encontrada.");
    }

    const { data, error } = await supabase
      .from("contact_messages")
      .update({ status: body.status })
      .eq("id", id)
      .select("id,name,email,phone,message,status,created_at")
      .single();

    if (error) throw error;

    logSecureEvent({
      event: "admin_contact_message_status_update",
      route: "/api/admin/contact-messages/[id]",
      request,
      actorId: user.id,
      detail: `message=${id.slice(0, 8)};status=${current.status}->${body.status}`,
    });

    return jsonOk({ message: data });
  } catch (error) {
    return jsonError(error);
  }
}

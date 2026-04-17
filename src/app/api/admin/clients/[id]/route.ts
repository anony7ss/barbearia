import { type NextRequest } from "next/server";
import { clientAdminSchema } from "@/features/admin/schemas";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { logSecureEvent } from "@/lib/server/logging";
import { parseUuidParam } from "@/lib/server/validation";

type AuthenticatedSupabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Cliente nao encontrado.");
    const { supabase, user } = await requireAdmin();
    const body = await parseJson(request, clientAdminSchema.partial());
    const { confirm_admin_role: confirmAdminRole, ...profileUpdate } = body;

    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("id,role,is_active,deleted_at")
      .eq("id", id)
      .maybeSingle();

    if (currentError || !current) {
      throw new ApiError(404, "Cliente nao encontrado.");
    }

    if (profileUpdate.role === "admin" && current.role !== "admin" && !confirmAdminRole) {
      throw new ApiError(400, "Confirmacao obrigatoria para promover admin.");
    }

    if (
      current.role === "admin" &&
      ((profileUpdate.role && profileUpdate.role !== "admin") || profileUpdate.is_active === false)
    ) {
      const remainingAdmins = await countRemainingAdmins(supabase, id);
      if (!remainingAdmins) {
        throw new ApiError(400, "Nao e possivel remover o ultimo admin ativo.");
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...profileUpdate,
        phone: profileUpdate.phone === "" ? null : profileUpdate.phone,
        internal_notes: profileUpdate.internal_notes === "" ? null : profileUpdate.internal_notes,
      })
      .eq("id", id)
      .select("id,full_name,phone,role,loyalty_points,preferred_barber_id,internal_notes,is_active,deleted_at,created_at")
      .single();

    if (error) throw error;
    logSecureEvent({
      event: "admin_client_update",
      route: "/api/admin/clients/[id]",
      request,
      actorId: user.id,
      detail: `target=${id.slice(0, 8)};role=${current.role}->${data.role};active=${data.is_active}`,
    });
    return jsonOk({ client: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, "Cliente nao encontrado.");
    const { supabase, user } = await requireAdmin();

    if (id === user.id) {
      throw new ApiError(400, "Nao e possivel excluir o proprio perfil administrativo.");
    }

    const { data: current } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    if (current?.role === "admin") {
      const remainingAdmins = await countRemainingAdmins(supabase, id);
      if (!remainingAdmins) {
        throw new ApiError(400, "Nao e possivel excluir o ultimo admin ativo.");
      }
    }

    const { error } = await supabase.rpc("soft_delete_profile", {
      p_profile_id: id,
      p_actor_id: user.id,
    });

    if (error) throw error;
    logSecureEvent({
      event: "admin_client_soft_delete",
      route: "/api/admin/clients/[id]",
      request,
      actorId: user.id,
      detail: `target=${id.slice(0, 8)}`,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function countRemainingAdmins(supabase: AuthenticatedSupabase, excludingId: string) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .is("deleted_at", null)
    .neq("id", excludingId);

  if (error) throw error;
  return count ?? 0;
}

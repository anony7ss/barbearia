import "server-only";

import { ApiError } from "@/lib/server/api";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    throw new ApiError(401, "Autenticacao obrigatoria.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.is_active !== true || profile.deleted_at !== null) {
    throw new ApiError(403, "Permissao insuficiente.");
  }

  if (profile.role === "admin") {
    return { supabase, user, profile };
  }

  const { data: adminUser, error: adminUserError } = await supabase
    .from("admin_users")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (adminUserError || !adminUser) {
    throw new ApiError(403, "Permissao insuficiente.");
  }

  return { supabase, user, profile };
}

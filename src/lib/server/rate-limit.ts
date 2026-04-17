import "server-only";

import { ApiError } from "@/lib/server/api";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";

export async function enforceRateLimit(
  key: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error || data !== true) {
    throw new ApiError(429, "Muitas tentativas. Tente novamente em instantes.");
  }
}

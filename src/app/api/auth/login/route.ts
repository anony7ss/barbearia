import { NextRequest } from "next/server";
import { loginRequestSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "auth_login", 12, 60);
    const body = await parseJson(request, loginRequestSchema);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session) {
      throw new ApiError(401, "Email ou senha invalidos.");
    }

    return jsonOk(
      { authenticated: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}


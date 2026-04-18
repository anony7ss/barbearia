import { NextRequest } from "next/server";
import { signupRequestSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "auth_signup", 8, 60);
    const body = await parseJson(request, signupRequestSchema);
    const supabase = await createSupabaseServerClient();
    const origin = new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        captchaToken: body.captchaToken || undefined,
        data: {
          full_name: body.fullName,
          phone: body.phone,
        },
      },
    });

    if (error) {
      return jsonOk(
        { authenticated: false, requiresEmailConfirmation: false, error: "Nao foi possivel criar a conta com esses dados." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    return jsonOk(
      {
        authenticated: Boolean(data.session),
        requiresEmailConfirmation: !data.session,
      },
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


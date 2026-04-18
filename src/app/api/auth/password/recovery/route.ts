import { createHash } from "crypto";
import { type NextRequest } from "next/server";
import { passwordRecoveryRequestSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request, passwordRecoveryRequestSchema);
    const emailKey = createHash("sha256").update(body.email).digest("hex");

    await enforceRateLimit(getClientFingerprint(request), "auth_password_recovery_ip", 6, 60);
    await enforceRateLimit(emailKey, "auth_password_recovery_email", 3, 60);
    await verifyTurnstileToken(body.captchaToken, getClientIp(request));

    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

    await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/resetar-senha`,
    });

    return jsonOk(
      {
        ok: true,
        message: "Se esse email estiver cadastrado, enviaremos um link para redefinir a senha.",
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

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
}

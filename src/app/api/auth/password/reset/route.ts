import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { passwordResetRequestSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "auth_password_reset", 6, 60);

    const cookieStore = await cookies();
    const resetFlow = cookieStore.get("password-reset-flow")?.value === "1";

    if (!resetFlow) {
      throw new ApiError(401, "Link de redefinicao expirado ou invalido.");
    }

    const body = await parseJson(request, passwordResetRequestSchema);
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new ApiError(401, "Link de redefinicao expirado ou invalido.");
    }

    const { error } = await supabase.auth.updateUser({
      password: body.password,
    });

    if (error) {
      throw new ApiError(400, "Nao foi possivel redefinir a senha.");
    }

    await supabase.auth.signOut();

    const response = jsonOk(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    response.cookies.set("password-reset-flow", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    return jsonError(error);
  }
}

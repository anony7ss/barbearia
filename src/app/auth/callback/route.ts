import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const source = safeAuthSource(requestUrl.searchParams.get("source"));
  const providerError = requestUrl.searchParams.get("error");
  let exchanged = false;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchanged = !error;
  }

  if (providerError || (code && !exchanged)) {
    const fallbackUrl = new URL(source === "signup" ? "/cadastro" : "/login", request.url);
    fallbackUrl.searchParams.set("oauthError", providerError ? "oauth_cancelled" : "oauth_failed");
    if (next !== "/meus-agendamentos") {
      fallbackUrl.searchParams.set("redirect", next);
    }
    return NextResponse.redirect(fallbackUrl);
  }

  const response = NextResponse.redirect(new URL(next, request.url));

  if (exchanged && next === "/resetar-senha") {
    response.cookies.set("password-reset-flow", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60,
      path: "/",
    });
  }

  return response;
}

function safeRedirectPath(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/meus-agendamentos";
}

function safeAuthSource(value: string | null) {
  return value === "signup" ? "signup" : "login";
}

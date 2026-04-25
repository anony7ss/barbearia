import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { guestAccessCookieName, setGuestAccessCookie } from "@/lib/server/guest-access";
import { createAccessToken, hashToken, verifyTokenHash } from "@/lib/server/tokens";

const accessSchema = z.object({
  appointmentId: z.string().uuid(),
  token: z.string().trim().min(24).max(256),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request, accessSchema);
    const sessionToken = await exchangeGuestAccess(body.appointmentId, body.token);

    const response = jsonOk({ ok: true });
    setGuestAccessCookie(response, body.appointmentId, sessionToken);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const appointmentId = request.nextUrl.searchParams.get("appointmentId") ?? "";
    const token = request.nextUrl.searchParams.get("token") ?? "";
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const code = request.nextUrl.searchParams.get("code");
    const parsed = accessSchema.parse({ appointmentId, token });
    const existingCookieToken = request.cookies.get(guestAccessCookieName(parsed.appointmentId))?.value;

    const sessionToken = await exchangeGuestAccess(parsed.appointmentId, parsed.token, existingCookieToken);

    const redirectUrl = new URL(next, request.url);
    if (code && redirectUrl.pathname === "/agendamento/sucesso") {
      redirectUrl.searchParams.set("code", code);
    }
    redirectUrl.searchParams.set("id", parsed.appointmentId);

    const response = NextResponse.redirect(redirectUrl);
    setGuestAccessCookie(response, parsed.appointmentId, sessionToken);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/meus-agendamentos", request.url));
  }
}

async function exchangeGuestAccess(appointmentId: string, token: string, fallbackCookieToken?: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("guest_access_token_hash")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  if (!data.guest_access_token_hash) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }

  if (verifyTokenHash(token, data.guest_access_token_hash)) {
    const nextToken = createAccessToken();
    const nextHash = hashToken(nextToken);
    await Promise.all([
      supabase
        .from("appointments")
        .update({ guest_access_token_hash: nextHash })
        .eq("id", appointmentId),
      supabase
        .from("appointment_guests")
        .update({ access_token_hash: nextHash })
        .eq("appointment_id", appointmentId),
    ]);
    return nextToken;
  }

  if (fallbackCookieToken && verifyTokenHash(fallbackCookieToken, data.guest_access_token_hash)) {
    return fallbackCookieToken;
  }

  throw new ApiError(404, "Agendamento nao encontrado.");
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/meus-agendamentos";
  }

  return value;
}

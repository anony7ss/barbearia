import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { setGuestAccessCookie } from "@/lib/server/guest-access";
import { verifyTokenHash } from "@/lib/server/tokens";

const accessSchema = z.object({
  appointmentId: z.string().uuid(),
  token: z.string().trim().min(24).max(256),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request, accessSchema);
    await assertGuestAccess(body.appointmentId, body.token);

    const response = jsonOk({ ok: true });
    setGuestAccessCookie(response, body.appointmentId, body.token);
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

    await assertGuestAccess(parsed.appointmentId, parsed.token);

    const redirectUrl = new URL(next, request.url);
    if (code && redirectUrl.pathname === "/agendamento/sucesso") {
      redirectUrl.searchParams.set("code", code);
    }
    redirectUrl.searchParams.set("id", parsed.appointmentId);

    const response = NextResponse.redirect(redirectUrl);
    setGuestAccessCookie(response, parsed.appointmentId, parsed.token);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/meus-agendamentos", request.url));
  }
}

async function assertGuestAccess(appointmentId: string, token: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("guest_access_token_hash")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data || !verifyTokenHash(token, data.guest_access_token_hash)) {
    throw new ApiError(404, "Agendamento nao encontrado.");
  }
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/meus-agendamentos";
  }

  return value;
}

import { createHash } from "crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/integrations/supabase/admin";
import { getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import { normalizeEmail, normalizePhone } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z
    .string()
    .trim()
    .max(32)
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value === "" || (value.length >= 8 && value.length <= 24), "Telefone invalido.")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(10).max(1200),
  company: z.string().optional(),
  turnstileToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "contact", 5, 60);
    const body = await parseJson(request, contactSchema);

    if (body.company) {
      return jsonOk({ ok: true });
    }

    await enforceRateLimit(normalizeEmail(body.email), "contact_email", 3, 3600);
    await verifyTurnstileToken(body.turnstileToken, request.headers.get("x-forwarded-for"));

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: body.name,
      email: normalizeEmail(body.email),
      phone: body.phone ? normalizePhone(body.phone) : null,
      message: body.message,
      ip_hash: hash(request.headers.get("x-forwarded-for") ?? "local"),
      user_agent_hash: hash(request.headers.get("user-agent") ?? "unknown"),
    });

    if (error) {
      throw error;
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

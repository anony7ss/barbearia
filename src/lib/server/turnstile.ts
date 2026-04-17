import "server-only";

import { ApiError } from "@/lib/server/api";

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(token?: string | null, remoteIp?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(500, "Validacao de seguranca nao configurada.");
    }

    return;
  }

  if (!token) {
    throw new ApiError(400, "Validacao de seguranca obrigatoria.");
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) {
    form.append("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new ApiError(400, "Validacao de seguranca indisponivel.");
  }

  const payload = (await response.json()) as TurnstileResponse;
  if (!payload.success) {
    throw new ApiError(400, "Validacao de seguranca invalida.");
  }
}

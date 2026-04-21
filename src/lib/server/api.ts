import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";

const maxJsonBodyBytes = 64 * 1024;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function parseJson<T>(request: NextRequest, schema: ZodSchema<T>) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxJsonBodyBytes) {
      throw new ApiError(413, "Payload muito grande.");
    }

    const payload = JSON.parse(await readJsonBody(request)) as unknown;
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw new ApiError(400, "Dados invalidos.");
    }
    throw new ApiError(400, "JSON invalido.");
  }
}

async function readJsonBody(request: NextRequest) {
  if (!request.body) {
    throw new ApiError(400, "JSON invalido.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let rawBody = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    bytesRead += value.byteLength;
    if (bytesRead > maxJsonBodyBytes) {
      await reader.cancel("Payload too large").catch(() => undefined);
      throw new ApiError(413, "Payload muito grande.");
    }

    rawBody += decoder.decode(value, { stream: true });
  }

  rawBody += decoder.decode();

  if (!rawBody.trim()) {
    throw new ApiError(400, "JSON invalido.");
  }

  return rawBody;
}

export function jsonOk<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

export function getClientFingerprint(request: NextRequest) {
  const forwardedFor = normalizeForwardedIp(request.headers.get("x-forwarded-for"));
  const realIp = normalizeForwardedIp(request.headers.get("x-real-ip"));
  const ua = request.headers.get("user-agent") ?? "unknown";
  return `${forwardedFor ?? realIp ?? "local"}:${ua.slice(0, 80)}`;
}

function normalizeForwardedIp(value: string | null) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0];
}

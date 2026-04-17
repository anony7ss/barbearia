import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";

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
    const payload = await request.json();
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(400, "Dados invalidos.");
    }
    throw new ApiError(400, "JSON invalido.");
  }
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
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const ua = request.headers.get("user-agent") ?? "unknown";
  return `${forwardedFor ?? realIp ?? "local"}:${ua.slice(0, 80)}`;
}

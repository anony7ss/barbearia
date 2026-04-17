import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

type LogLevel = "info" | "warn" | "error";

type SecureLogInput = {
  level?: LogLevel;
  event: string;
  route: string;
  request?: NextRequest;
  actorId?: string | null;
  appointmentId?: string | null;
  status?: number;
  detail?: string;
};

export function logSecureEvent(input: SecureLogInput) {
  const payload = {
    event: input.event,
    route: input.route,
    status: input.status,
    actor_hash: input.actorId ? hashForLog(input.actorId) : null,
    appointment_hash: input.appointmentId ? hashForLog(input.appointmentId) : null,
    ip_hash: input.request ? hashForLog(readIp(input.request)) : null,
    user_agent_hash: input.request ? hashForLog(input.request.headers.get("user-agent") ?? "unknown") : null,
    detail: input.detail,
    at: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);
  const level = input.level ?? "info";
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function safeOperationalError(error: unknown, fallback = "Falha operacional.") {
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }

  return error instanceof Error ? error.message.slice(0, 300) : fallback;
}

function readIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "local";
}

function hashForLog(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

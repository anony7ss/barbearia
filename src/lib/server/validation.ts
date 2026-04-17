import "server-only";

import { z } from "zod";
import { ApiError } from "@/lib/server/api";

const uuidSchema = z.string().uuid();

export function parseUuidParam(value: string, message = "Registro nao encontrado.") {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(404, message);
  }
  return parsed.data;
}

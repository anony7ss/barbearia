import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createLookupCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyTokenHash(token: string, expectedHash: string | null | undefined) {
  if (!expectedHash) return false;

  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

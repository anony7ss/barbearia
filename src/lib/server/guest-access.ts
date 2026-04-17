import "server-only";

import { type NextRequest, type NextResponse } from "next/server";

const GUEST_ACCESS_COOKIE_PREFIX = "cn_guest_access_";
const GUEST_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

export function guestAccessCookieName(appointmentId: string) {
  return `${GUEST_ACCESS_COOKIE_PREFIX}${appointmentId.replaceAll("-", "")}`;
}

export function readGuestAccessToken(
  request: NextRequest,
  appointmentId: string,
  explicitToken?: string | null,
) {
  return explicitToken || request.cookies.get(guestAccessCookieName(appointmentId))?.value;
}

export function setGuestAccessCookie(
  response: NextResponse,
  appointmentId: string,
  token: string,
) {
  response.cookies.set(guestAccessCookieName(appointmentId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_ACCESS_MAX_AGE,
  });
}

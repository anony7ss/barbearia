"use client";

import Script from "next/script";
import { isTurnstilePublicEnabled } from "@/lib/turnstile-config";

export function TurnstileField() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey || !isTurnstilePublicEnabled()) {
    return null;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-background/45 p-3">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="dark"
        data-size="flexible"
      />
    </div>
  );
}

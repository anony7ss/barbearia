"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const registerServiceWorker = () => {
      if (cancelled) return;

      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // PWA registration is progressive enhancement; the site must keep working.
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}

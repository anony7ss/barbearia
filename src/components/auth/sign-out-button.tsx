"use client";

import { useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/integrations/supabase/client";

type SignOutButtonProps = {
  children: ReactNode;
  className?: string;
};

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);

    try {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {}

      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={className}
    >
      {children}
    </button>
  );
}

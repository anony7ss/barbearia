"use client";

import { useState, type ReactNode } from "react";

type SignOutButtonProps = {
  children: ReactNode;
  className?: string;
};

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);
    window.location.assign("/sair");
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

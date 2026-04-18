import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { PublicShell } from "@/components/site/public-shell";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export const metadata: Metadata = {
  title: "Resetar senha",
  description: "Crie uma nova senha para sua conta Corte Nobre.",
};

export default async function PasswordResetPage() {
  const cookieStore = await cookies();
  const hasResetCookie = cookieStore.get("password-reset-flow")?.value === "1";
  let canReset = false;

  if (hasResetCookie) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      canReset = Boolean(user);
    } catch {
      canReset = false;
    }
  }

  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[80svh] max-w-6xl gap-10 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Nova senha
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
            Defina uma senha forte para sua conta.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            O link de redefinicao e temporario. Depois de salvar, voce entrara
            novamente com a nova senha.
          </p>
        </div>
        <PasswordResetForm canReset={canReset} />
      </section>
    </PublicShell>
  );
}

import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link seguro para redefinir sua senha na Corte Nobre.",
};

export default function PasswordRecoveryPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[80svh] max-w-6xl gap-10 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Recuperacao segura
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
            Receba um link para trocar sua senha.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            Informe o email da conta. Se ele estiver cadastrado, enviaremos um
            link temporario para criar uma nova senha.
          </p>
        </div>
        <PasswordRecoveryForm />
      </section>
    </PublicShell>
  );
}

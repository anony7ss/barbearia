import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { PublicShell } from "@/components/site/public-shell";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta para acelerar agendamentos na Corte Nobre.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ oauthError?: string }>;
}) {
  const params = await searchParams;
  const fallbackRedirect = "/meus-agendamentos";
  const oauthError = getOauthErrorMessage(params.oauthError);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/meus-agendamentos");
  }

  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[80svh] max-w-6xl gap-10 px-4 pb-20 pt-36 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Cadastro
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
            Salve seus dados e agende mais rapido.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            A conta e opcional, mas ajuda a consultar historico, cancelar,
            reagendar e manter preferencias.
          </p>
        </div>
        <AuthForm mode="signup" redirectTo={fallbackRedirect} initialOAuthError={oauthError} />
      </section>
    </PublicShell>
  );
}

function getOauthErrorMessage(value: string | undefined) {
  switch (value) {
    case "oauth_cancelled":
      return "O login social foi cancelado ou nao foi concluido.";
    case "oauth_failed":
      return "Nao foi possivel concluir o login social.";
    default:
      return null;
  }
}

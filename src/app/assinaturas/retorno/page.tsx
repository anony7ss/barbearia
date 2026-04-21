import type { Metadata } from "next";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { retrieveCheckoutSession } from "@/integrations/stripe/server";
import { PublicShell } from "@/components/site/public-shell";
import { ButtonLink } from "@/components/ui/button-link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status da assinatura",
  description: "Resultado do checkout de assinatura Corte Nobre.",
};

type PageProps = {
  searchParams: Promise<{
    session_id?: string | string[];
  }>;
};

export default async function SubscriptionReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = Array.isArray(params.session_id) ? params.session_id[0] : params.session_id;
  const session = sessionId ? await retrieveCheckoutSession(sessionId).catch(() => null) : null;
  const isComplete = session?.status === "complete" || session?.payment_status === "paid";
  const isPending = session && !isComplete;

  return (
    <PublicShell>
      <main className="bg-background px-4 pb-20 pt-28 text-foreground sm:px-6 lg:px-8 lg:pt-32">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white/[0.035] p-7 text-center sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-line bg-black/18 text-brass">
            {isComplete ? (
              <CheckCircle2 size={32} aria-hidden="true" />
            ) : isPending ? (
              <Clock3 size={32} aria-hidden="true" />
            ) : (
              <XCircle size={32} aria-hidden="true" />
            )}
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Assinatura
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {isComplete
              ? "Checkout concluido."
              : isPending
                ? "Checkout em processamento."
                : "Nao foi possivel confirmar."}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
            {isComplete
              ? "Sua assinatura foi registrada no Stripe. Use a agenda normalmente enquanto o teste evolui para liberar beneficios automaticos."
              : isPending
                ? "O Stripe ainda esta confirmando o pagamento. Aguarde alguns instantes e consulte seu email."
                : "Nao encontramos uma sessao valida. Voce pode tentar iniciar o checkout novamente."}
          </p>

          {session?.id ? (
            <p className="mt-6 rounded-2xl border border-line bg-black/18 px-4 py-3 font-mono text-xs text-muted">
              Sessao: {session.id}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/agendamento">Agendar horario</ButtonLink>
            <ButtonLink href="/assinaturas" variant="secondary">
              Voltar para assinaturas
            </ButtonLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

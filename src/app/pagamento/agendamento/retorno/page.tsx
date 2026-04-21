import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { retrieveCheckoutSession } from "@/integrations/stripe/server";
import { PublicShell } from "@/components/site/public-shell";
import { syncAppointmentPaymentFromCheckoutSession } from "@/lib/server/appointment-payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status do pagamento",
  description: "Resultado do pagamento online do seu agendamento.",
};

type PageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default async function AppointmentPaymentReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = Array.isArray(params.session_id) ? params.session_id[0] : params.session_id;
  const session = sessionId ? await retrieveCheckoutSession(sessionId).catch(() => null) : null;
  const syncResult = session ? await syncAppointmentPaymentFromCheckoutSession(session).catch(() => null) : null;
  const isPaid = syncResult?.paymentStatus === "paid" || session?.payment_status === "paid";
  const isPending = Boolean(session && !isPaid);
  const appointmentHref = syncResult?.appointmentId
    ? `/meus-agendamentos?id=${syncResult.appointmentId}`
    : "/meus-agendamentos";

  return (
    <PublicShell>
      <main className="bg-background px-4 pb-20 pt-28 text-foreground sm:px-6 lg:px-8 lg:pt-32">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white/[0.035] p-7 text-center sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-line bg-black/18 text-brass">
            {isPaid ? (
              <CheckCircle2 size={32} aria-hidden="true" />
            ) : isPending ? (
              <Clock3 size={32} aria-hidden="true" />
            ) : (
              <XCircle size={32} aria-hidden="true" />
            )}
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Pagamento
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {isPaid
              ? "Pagamento confirmado."
              : isPending
                ? "Pagamento em processamento."
                : "Nao foi possivel confirmar."}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
            {isPaid
              ? "Seu agendamento foi marcado como pago. O comprovante tambem fica registrado no Stripe."
              : isPending
                ? "O Stripe ainda esta processando a transacao. Aguarde alguns instantes e consulte sua agenda."
                : "Nao encontramos uma sessao valida. Voce pode tentar pagar novamente pelo historico do agendamento."}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={appointmentHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink"
            >
              Ver meus agendamentos
            </Link>
            <Link
              href="/agendamento"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              Novo agendamento
            </Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

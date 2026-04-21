import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarCheck, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { EmbeddedSubscriptionCheckout } from "@/components/subscriptions/embedded-checkout";
import { ButtonLink } from "@/components/ui/button-link";
import { PublicShell } from "@/components/site/public-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assinatura Corte Nobre",
  description: "Plano mensal de cuidado masculino com beneficios, prioridade e checkout seguro no site.",
};

const benefits = [
  "Corte executivo mensal com previsibilidade no cuidado",
  "Prioridade para reagendar horarios recorrentes",
  "Beneficios futuros vinculados ao seu cadastro",
  "Pagamento recorrente processado com seguranca pela Stripe",
];

const steps = [
  ["1", "Assine no site", "Checkout embutido, sem sair da Corte Nobre."],
  ["2", "Agende normalmente", "Use sua conta para acompanhar historico e preferencias."],
  ["3", "Mantenha o ritmo", "Mais praticidade para manter o corte sempre em dia."],
];

export default function SubscriptionsPage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;

  return (
    <PublicShell>
      <main className="bg-background text-foreground">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pt-32">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Assinatura
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
              Cuidado recorrente, agenda mais simples.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Um teste de assinatura para quem quer manter o corte em dia, com
              beneficios pensados para recorrencia e menos atrito na agenda.
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-line bg-white/[0.035] p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brass text-ink">
                  <Sparkles size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xl font-semibold">Corte Nobre Mensal</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Plano experimental. O valor pode ser ajustado por env ou
                    substituido por um Price fixo no Stripe.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-brass/35 text-brass">
                      <Check size={14} aria-hidden="true" />
                    </span>
                    <p className="text-sm leading-6 text-muted">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PlanMetric icon={<CreditCard size={17} />} label="Cobranca" value="mensal" />
              <PlanMetric icon={<CalendarCheck size={17} />} label="Uso" value="agenda online" />
              <PlanMetric icon={<ShieldCheck size={17} />} label="Ambiente" value="teste Stripe" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/agendamento" variant="secondary">
                Ver agenda
              </ButtonLink>
              <ButtonLink href="/meus-agendamentos" variant="ghost">
                Area do cliente
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.75rem] border border-line bg-white/[0.035] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                Como funciona
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {steps.map(([number, title, text]) => (
                  <div key={number} className="rounded-2xl border border-line bg-black/18 p-4">
                    <span className="font-mono text-sm text-brass">{number}</span>
                    <p className="mt-4 font-semibold">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <EmbeddedSubscriptionCheckout publishableKey={publishableKey} />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function PlanMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.035] p-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

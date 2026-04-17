import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-shell";
import { ServicesGrid } from "@/components/site/services-grid";
import { CTASection } from "@/components/site/cta-section";

export const metadata: Metadata = {
  title: "Servicos",
  description: "Servicos, duracoes e precos da Corte Nobre Barbearia.",
};

export default function ServicesPage() {
  return (
    <PublicShell>
      <section className="px-4 pb-10 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Servicos
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Rituais objetivos para sair pronto.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Preco claro, duracao realista e CTA direto para marcar o horario
            que encaixa na sua agenda.
          </p>
        </div>
      </section>
      <ServicesGrid />
      <CTASection />
    </PublicShell>
  );
}

import type { Metadata } from "next";
import { BarbersSection } from "@/components/site/barbers-section";
import { CTASection } from "@/components/site/cta-section";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Equipe",
  description: "Conheca os barbeiros da Corte Nobre e escolha seu profissional.",
};

export default function TeamPage() {
  return (
    <PublicShell>
      <section className="px-4 pb-8 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Barbeiros
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Tecnica, repertorio e escuta.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Escolha por especialidade ou deixe o sistema encontrar o melhor
            horario disponivel.
          </p>
        </div>
      </section>
      <BarbersSection />
      <CTASection />
    </PublicShell>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { PublicShell } from "@/components/site/public-shell";
import { CTASection } from "@/components/site/cta-section";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Historia, proposta e ambiente da Corte Nobre Barbearia.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Sobre
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Alto nivel sem teatro.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted">
              A Corte Nobre nasceu para homens que querem um atendimento
              preciso, bonito e pontual. Sem fila improvisada, sem pressa no
              acabamento e sem ritual vazio: cada etapa tem funcao.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Agenda objetiva", "Ambiente reservado", "Acabamento consistente"].map((item) => (
                <div key={item} className="rounded-2xl border border-line p-4 text-sm text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
            <Image
              src="/images/barbershop-detail.svg"
              alt="Cadeira e bancada de uma barbearia premium"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
      <CTASection />
    </PublicShell>
  );
}

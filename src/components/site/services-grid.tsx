import { Scissors } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/site/section-reveal";
import { services } from "@/lib/site-data";
import { formatCurrency } from "@/lib/utils";
import { NextAvailableCTA } from "@/components/site/next-available-cta";

export function ServicesGrid({ limit }: { limit?: number }) {
  const list = typeof limit === "number" ? services.slice(0, limit) : services;

  return (
    <section className="bg-paper text-ink">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-oxblood">
              Servicos
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Escolha o ritual certo para o seu momento.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <NextAvailableCTA tone="light" />
            <ButtonLink href="/agendamento">Agendar direto</ButtonLink>
          </div>
        </SectionReveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((service, index) => (
            <SectionReveal
              key={service.id}
              delay={index * 0.04}
              className="group rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(21,18,15,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_90px_rgba(21,18,15,0.14)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
                  <Scissors size={20} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-brass/18 px-3 py-1 text-xs font-semibold text-oxblood">
                  {service.highlight}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{service.name}</h3>
              <p className="mt-3 min-h-16 text-sm leading-6 text-ink/68">
                {service.description}
              </p>
              <div className="mt-5 grid gap-2 text-sm text-ink/72">
                <p><strong>Ideal para:</strong> {service.idealFor}</p>
                <p><strong>Inclui:</strong> {service.includes.join(", ")}</p>
                <p><strong>Resultado:</strong> {service.result}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-5">
                <span className="font-mono text-sm text-ink/60">
                  {service.durationMinutes} min
                </span>
                <span className="text-xl font-semibold">
                  {formatCurrency(service.priceCents)}
                </span>
              </div>
              <ButtonLink
                href={`/agendamento?service=${service.slug}`}
                variant="secondary"
                className="mt-6 w-full border-ink/10 bg-ink text-paper hover:bg-oxblood"
              >
                Agendar este servico
              </ButtonLink>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

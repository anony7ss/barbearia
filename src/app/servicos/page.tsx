import type { Metadata } from "next";
import { BadgeCheck, Clock3, Scissors, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/site/public-shell";
import { ServicesGrid } from "@/components/site/services-grid";
import { CTASection } from "@/components/site/cta-section";
import { ButtonLink } from "@/components/ui/button-link";
import { NextAvailableCTA } from "@/components/site/next-available-cta";
import { services } from "@/lib/site-data";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Servicos",
  description: "Servicos, duracoes e precos da Corte Nobre Barbearia.",
};

export default function ServicesPage() {
  const lowestPrice = Math.min(...services.map((service) => service.priceCents));

  return (
    <PublicShell>
      <section className="px-4 pb-14 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Servicos
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Catalogo direto, sem etapa escondida.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Escolha pelo resultado esperado, veja preco e duracao antes de
              confirmar e agende com ou sem conta.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <NextAvailableCTA />
              <ButtonLink href="/agendamento" variant="secondary">
                Agendar manualmente
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ServiceHeroStat
              icon={<Scissors size={18} />}
              value={`${services.length}`}
              label="servicos ativos"
            />
            <ServiceHeroStat
              icon={<Clock3 size={18} />}
              value="15-120 min"
              label="duracao clara"
            />
            <ServiceHeroStat
              icon={<BadgeCheck size={18} />}
              value={`desde ${formatCurrency(lowestPrice)}`}
              label="preco visivel"
            />
            <ServiceHeroStat
              icon={<ShieldCheck size={18} />}
              value="sem conta"
              label="cadastro opcional"
            />
          </div>
        </div>
      </section>
      <ServicesGrid />
      <CTASection />
    </PublicShell>
  );
}

function ServiceHeroStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="border-t border-line pt-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  );
}

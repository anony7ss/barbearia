import type { Metadata } from "next";
import { CalendarClock, Scissors, Star } from "lucide-react";
import type { ReactNode } from "react";
import { BarbersSection } from "@/components/site/barbers-section";
import { CTASection } from "@/components/site/cta-section";
import { PublicShell } from "@/components/site/public-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getPublicBarbers } from "@/features/barbers/public-data";

export const metadata: Metadata = {
  title: "Equipe",
  description: "Conheca os barbeiros da Corte Nobre e escolha seu profissional.",
};

export default async function TeamPage() {
  const barbers = await getPublicBarbers().catch(() => []);
  const averageRating = (
    barbers.reduce((sum, barber) => sum + Number(barber.rating), 0) / Math.max(barbers.length, 1)
  ).toFixed(2);

  return (
    <PublicShell>
      <section className="px-4 pb-10 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Barbeiros
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Tecnica, repertorio e escuta.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Escolha por especialidade, estilo de acabamento ou disponibilidade
              na semana. Cada profissional tem pagina propria e CTA direto.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/agendamento">Agendar agora</ButtonLink>
              <ButtonLink href="/servicos" variant="secondary">
                Ver servicos
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <TeamHeroStat icon={<Star size={17} />} value={averageRating} label="nota media" />
            <TeamHeroStat icon={<Scissors size={17} />} value={`${barbers.length}`} label="especialistas" />
            <TeamHeroStat icon={<CalendarClock size={17} />} value="agenda" label="online" />
          </div>
        </div>
      </section>
      <BarbersSection barbers={barbers} />
      <CTASection />
    </PublicShell>
  );
}

function TeamHeroStat({
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

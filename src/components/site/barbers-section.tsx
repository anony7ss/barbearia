import Link from "next/link";
import { CalendarClock, Scissors, Star } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/site/section-reveal";
import { barbers as fallbackBarbers } from "@/lib/site-data";
import type { PublicBarber } from "@/features/barbers/public-data";

type BarberCardData = Pick<
  PublicBarber,
  "id" | "name" | "slug" | "bio" | "specialties" | "photoUrl" | "rating" | "reviewCount" | "badge" | "roleLabel"
>;

export function BarbersSection({ limit, barbers }: { limit?: number; barbers?: BarberCardData[] }) {
  const source = barbers?.length ? barbers : fallbackBarbers.map(toFallbackBarber);
  const list = typeof limit === "number" ? source.slice(0, limit) : source;
  const isPreview = typeof limit === "number";
  const ratedBarbers = source.filter((barber) => barber.reviewCount > 0);
  const averageRating = ratedBarbers.length
    ? (ratedBarbers.reduce((sum, barber) => sum + Number(barber.rating), 0) / ratedBarbers.length).toFixed(2)
    : "Sem notas";

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Equipe
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Profissionais com assinatura propria.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Escolha por especialidade, preferencia de agenda ou estilo de
              acabamento. Cada perfil abre direto no agendamento.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <TeamStat icon={<Star size={17} />} value={averageRating} label="nota media" />
            <TeamStat icon={<Scissors size={17} />} value={`${source.length}`} label="barbeiros" />
            <TeamStat icon={<CalendarClock size={17} />} value="online" label="agenda" />
          </div>
        </SectionReveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {list.map((barber, index) => (
            <SectionReveal
              key={barber.id}
              delay={index * 0.05}
              className="group overflow-hidden rounded-[2rem] border border-line bg-smoke transition hover:-translate-y-1 hover:border-brass/45"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={barber.photoUrl ?? "/images/barbershop-tools.svg"}
                  alt={`Foto de ${barber.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/18 to-transparent" />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-brass px-3 py-1 text-xs font-bold text-ink">
                    {barber.badge}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-white/16 bg-background/70 px-3 py-1 text-sm backdrop-blur">
                    <Star className="fill-brass text-brass" size={14} aria-hidden="true" />
                    {barber.reviewCount > 0 ? barber.rating : "Novo"}
                  </span>
                </div>
                <div className="absolute inset-x-5 bottom-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">
                    {barber.roleLabel}
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
                    {barber.name}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-6 text-muted">{barber.bio}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {barber.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
                <div className="mt-6 grid gap-2">
                  <ButtonLink
                    href={`/agendamento?barber=${barber.slug}`}
                    variant="secondary"
                    className="w-full border-brass/35 bg-brass text-ink hover:bg-[#d4aa68]"
                  >
                    Agendar com {barber.name.split(" ")[0]}
                  </ButtonLink>
                  <Link
                    href={`/equipe/${barber.slug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                  >
                    Ver perfil completo
                  </Link>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>

        {isPreview ? (
          <SectionReveal className="mt-8 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-muted">
              Prefere decidir pelo estilo do profissional? Veja agenda,
              especialidades e portfolio antes de marcar.
            </p>
            <ButtonLink href="/equipe" variant="secondary">
              Ver equipe completa
            </ButtonLink>
          </SectionReveal>
        ) : null}
      </div>
    </section>
  );
}

function toFallbackBarber(barber: (typeof fallbackBarbers)[number]): BarberCardData {
  return {
    id: barber.id,
    name: barber.name,
    slug: barber.slug,
    bio: barber.bio,
    specialties: barber.specialties,
    photoUrl: barber.image,
    rating: barber.rating,
    reviewCount: 0,
    badge: barber.badge,
    roleLabel: barber.role,
  };
}

function TeamStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.035] p-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  );
}

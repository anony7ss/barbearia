import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/site/section-reveal";
import { barbers } from "@/lib/site-data";

export function BarbersSection({ limit }: { limit?: number }) {
  const list = typeof limit === "number" ? barbers.slice(0, limit) : barbers;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Equipe
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Profissionais com assinatura propria.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            Cada barbeiro une tecnica, escuta e consistencia para entregar um
            resultado que funciona depois que voce sai da cadeira.
          </p>
        </SectionReveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {list.map((barber, index) => (
            <SectionReveal
              key={barber.id}
              delay={index * 0.05}
              className="group overflow-hidden rounded-[2rem] border border-line bg-smoke"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={barber.image}
                  alt={`Foto de ${barber.name}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/88 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-brass px-3 py-1 text-xs font-bold text-ink">
                  {barber.badge}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold">{barber.name}</h3>
                    <p className="mt-1 text-sm text-muted">{barber.role}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm">
                    <Star className="fill-brass text-brass" size={14} aria-hidden="true" />
                    {barber.rating}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{barber.bio}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {barber.specialties.map((specialty) => (
                    <span key={specialty} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                      {specialty}
                    </span>
                  ))}
                </div>
                <div className="mt-6 grid gap-2">
                  <ButtonLink href={`/agendamento?barber=${barber.slug}`} variant="secondary" className="w-full">
                    Agendar com {barber.name.split(" ")[0]}
                  </ButtonLink>
                  <Link
                    href={`/equipe/${barber.slug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

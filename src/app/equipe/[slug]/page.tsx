import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Scissors, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { PublicShell } from "@/components/site/public-shell";
import { SafeImage } from "@/components/site/safe-image";
import { barbers, galleryImages, services } from "@/lib/site-data";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return barbers.map((barber) => ({ slug: barber.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const barber = barbers.find((item) => item.slug === slug);

  if (!barber) {
    return {};
  }

  return {
    title: barber.name,
    description: `${barber.name}: ${barber.role} na Corte Nobre Barbearia.`,
  };
}

export default async function BarberPage({ params }: PageProps) {
  const { slug } = await params;
  const barber = barbers.find((item) => item.slug === slug);

  if (!barber) {
    notFound();
  }

  const firstName = barber.name.split(" ")[0];
  const preferredServices = services.slice(0, 3);

  return (
    <PublicShell>
      <main className="bg-background">
        <section className="px-4 pb-14 pt-36 sm:px-6 lg:px-8 lg:pt-40">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/equipe"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar para equipe
            </Link>

            <div className="barber-profile-grid">
              <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-line bg-smoke">
                  <SafeImage
                    src={barber.image}
                    alt={`Retrato profissional de ${barber.name}`}
                    fallbackLabel={barber.name}
                    fill
                    sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, 100vw"
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <ProfileFact label="Avaliacao" value={barber.rating} icon={<Star size={16} fill="currentColor" />} />
                  <ProfileFact label="Foco" value={barber.badge} icon={<Scissors size={16} />} />
                  <ProfileFact label="Agenda" value="Online" icon={<CalendarDays size={16} />} />
                </div>
              </aside>

              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
                  {barber.role}
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  {barber.name}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{barber.bio}</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {barber.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm text-muted"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href={`/agendamento?barber=${barber.slug}`}>
                    Agendar com {firstName}
                  </ButtonLink>
                  <ButtonLink href="/agendamento" variant="secondary">
                    Ver todos os horarios
                  </ButtonLink>
                </div>

                <section className="mt-12">
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
                        Servicos indicados
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
                        Direto para reservar.
                      </h2>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {preferredServices.map((service) => (
                      <article key={service.id} className="rounded-[1.25rem] border border-line bg-smoke p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
                          {service.highlight}
                        </p>
                        <h3 className="mt-3 text-xl font-semibold">{service.name}</h3>
                        <p className="mt-3 min-h-12 text-sm leading-6 text-muted">{service.result}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
                          <span className="text-muted">{service.durationMinutes} min</span>
                          <strong>{formatCurrency(service.priceCents)}</strong>
                        </div>
                        <ButtonLink
                          href={`/agendamento?service=${service.slug}&barber=${barber.slug}`}
                          variant="secondary"
                          className="mt-5 w-full"
                        >
                          Agendar
                        </ButtonLink>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-smoke px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
                  Portfolio
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
                  Referencias de acabamento.
                </h2>
              </div>
              <p className="text-sm leading-6 text-muted">
                Em producao, use apenas imagens autorizadas por clientes. Aqui a galeria funciona como referencia visual.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {galleryImages.map((image, index) => (
                <div
                  key={image}
                  className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-line bg-background"
                >
                  <SafeImage
                    src={image}
                    alt={`Referencia ${index + 1} de acabamento`}
                    fallbackLabel={`Referencia ${index + 1}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function ProfileFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-line bg-smoke p-3">
      <div className="mb-3 text-brass">{icon}</div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

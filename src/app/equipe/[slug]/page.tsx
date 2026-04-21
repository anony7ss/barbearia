import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Scissors, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/state";
import { PublicShell } from "@/components/site/public-shell";
import { getPublicBarberBySlug, getPublicGalleryForBarber } from "@/features/barbers/public-data";
import { services } from "@/lib/site-data";
import { getPublicReviewsForBarber } from "@/lib/server/reviews";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const barber = await getPublicBarberBySlug(slug).catch(() => null);

  if (!barber) {
    return {};
  }

  return {
    title: barber.name,
    description: `${barber.name}: ${barber.roleLabel} na Corte Nobre Barbearia.`,
  };
}

export default async function BarberPage({ params }: PageProps) {
  const { slug } = await params;
  const barber = await getPublicBarberBySlug(slug).catch(() => null);

  if (!barber) {
    notFound();
  }

  const firstName = barber.name.split(" ")[0];
  const preferredServices = services.slice(0, 3);
  const [gallery, reviews] = await Promise.all([
    getPublicGalleryForBarber(barber.id).catch(() => []),
    getPublicReviewsForBarber(barber.id).catch(() => []),
  ]);
  const reviewLabel = barber.reviewCount > 0 ? `${barber.rating} (${barber.reviewCount})` : "Sem notas";

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={barber.photoUrl ?? "/images/barbershop-tools.svg"}
                    alt={`Retrato profissional de ${barber.name}`}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <ProfileFact label="Avaliacao" value={reviewLabel} icon={<Star size={16} fill="currentColor" />} />
                  <ProfileFact label="Foco" value={barber.badge} icon={<Scissors size={16} />} />
                  <ProfileFact label="Agenda" value="Online" icon={<CalendarDays size={16} />} />
                </div>
              </aside>

              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
                  {barber.roleLabel}
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

                <section className="mt-12">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
                        Avaliacoes reais
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
                        O que clientes dizem sobre {firstName}.
                      </h2>
                    </div>
                    <div className="rounded-full border border-line bg-smoke px-4 py-2 text-sm font-semibold text-muted">
                      {barber.reviewCount > 0 ? `${barber.rating}/5 em ${barber.reviewCount} avaliacoes` : "Sem avaliacoes publicas"}
                    </div>
                  </div>

                  {reviews.length ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {reviews.map((review, index) => (
                        <article key={`${review.author}-${index}`} className="rounded-[1.25rem] border border-line bg-smoke p-5">
                          <div className="flex items-center justify-between gap-3">
                            <StarRating rating={review.rating} />
                            <span className="text-sm font-semibold text-brass">{review.rating}/5</span>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-foreground">&quot;{review.quote}&quot;</p>
                          <div className="mt-5 border-t border-line pt-4">
                            <p className="font-semibold">{review.author}</p>
                            <p className="mt-1 text-xs text-muted">{review.serviceName ?? "Atendimento verificado"}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Ainda sem avaliacoes publicas"
                      description="Quando clientes avaliarem atendimentos concluidos, os depoimentos aparecem aqui automaticamente."
                    />
                  )}
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
                Imagens reais publicadas pela equipe para mostrar estilo, acabamento e referencias recentes.
              </p>
            </div>

            {gallery.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {gallery.map((image, index) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-line bg-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt={image.altText}
                    loading={index < 3 ? "eager" : "lazy"}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {image.caption ? (
                    <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-background/75 px-4 py-3 text-sm font-semibold backdrop-blur">
                      {image.caption}
                    </div>
                  ) : null}
                </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Portfolio em montagem"
                description="Este profissional ainda nao publicou imagens na galeria."
              />
            )}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-brass" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={15}
          fill={value <= rating ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </div>
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

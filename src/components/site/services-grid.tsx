import {
  BadgeCheck,
  Check,
  Clock3,
  Flame,
  Scissors,
  Sparkles,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionReveal } from "@/components/site/section-reveal";
import { services } from "@/lib/site-data";
import { cn, formatCurrency } from "@/lib/utils";
import { NextAvailableCTA } from "@/components/site/next-available-cta";

type Service = (typeof services)[number];

const proofItems = [
  "Preco e duracao antes de confirmar",
  "Horarios calculados pela disponibilidade real",
  "Agendamento com ou sem conta",
];

const serviceAccents = [
  "border-brass/45 bg-brass/12 text-brass",
  "border-oxblood/30 bg-oxblood/12 text-[#d8a3a3]",
  "border-white/16 bg-white/[0.055] text-foreground",
  "border-brass/30 bg-[#201915] text-brass",
  "border-white/14 bg-[#141210] text-muted",
  "border-oxblood/28 bg-[#1f1212] text-[#d8a3a3]",
];

export function ServicesGrid({ limit }: { limit?: number }) {
  const list = typeof limit === "number" ? services.slice(0, limit) : services;
  const isPreview = typeof limit === "number";

  if (isPreview) {
    return <HomeServicesPreview services={list} />;
  }

  return <ServicesCatalog services={list} />;
}

function HomeServicesPreview({ services: list }: { services: Service[] }) {
  const featured = list[0];
  const supporting = list.slice(1);

  return (
    <section className="bg-paper text-ink">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-oxblood">
              Servicos
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Escolha pelo resultado, agende pelo horario.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <NextAvailableCTA tone="light" />
            <ButtonLink href="/servicos">Ver catalogo</ButtonLink>
          </div>
        </SectionReveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          {featured ? <FeaturedService service={featured} /> : null}

          <div className="grid gap-4">
            {supporting.map((service, index) => (
              <CompactServiceCard key={service.id} service={service} index={index + 1} />
            ))}

            <SectionReveal
              delay={0.1}
              className="rounded-[1.5rem] border border-ink/10 bg-white/70 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {proofItems.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ink text-paper">
                      <Check size={14} aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium leading-5 text-ink/72">{item}</p>
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedService({ service }: { service: Service }) {
  return (
    <SectionReveal className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-ink p-6 text-paper shadow-[0_28px_90px_rgba(21,18,15,0.22)] sm:p-8">
      <div className="flex flex-col justify-between gap-8 lg:min-h-[540px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-brass px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-ink">
              <Flame size={14} aria-hidden="true" />
              {service.highlight}
            </span>
            <span className="text-sm text-paper/58">servico assinatura</span>
          </div>

          <h3 className="mt-7 max-w-lg text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {service.name}
          </h3>
          <p className="mt-5 max-w-xl text-base leading-7 text-paper/72">
            {service.description}
          </p>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ServiceMetric label="Duracao" value={`${service.durationMinutes} min`} />
            <ServiceMetric label="Valor" value={formatCurrency(service.priceCents)} />
            <ServiceMetric label="Resultado" value="pronto para sair" />
          </div>

          <div className="mt-6 grid gap-4 border-t border-white/12 pt-6 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                Ideal para
              </p>
              <p className="mt-3 text-sm leading-6 text-paper/72">{service.idealFor}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                Inclui
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {service.includes.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 px-3 py-1 text-xs text-paper/76"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <ButtonLink
            href={`/agendamento?service=${service.slug}`}
            className="mt-7 w-full sm:w-auto sm:min-w-56"
          >
            Agendar este servico
          </ButtonLink>
        </div>
      </div>
    </SectionReveal>
  );
}

function CompactServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <SectionReveal
      delay={index * 0.04}
      className="group rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-[0_22px_70px_rgba(21,18,15,0.07)] transition hover:-translate-y-1 hover:shadow-[0_26px_90px_rgba(21,18,15,0.13)]"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-ink text-paper">
              <Scissors size={18} aria-hidden="true" />
            </span>
            <span className="rounded-full bg-brass/18 px-3 py-1 text-xs font-semibold text-oxblood">
              {service.highlight}
            </span>
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">{service.name}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/68">{service.description}</p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-mono text-sm text-ink/54">{service.durationMinutes} min</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(service.priceCents)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/64">{service.result}</p>
        <ButtonLink
          href={`/agendamento?service=${service.slug}`}
          variant="secondary"
          className="border-ink/10 bg-ink text-paper hover:bg-oxblood"
        >
          Agendar
        </ButtonLink>
      </div>
    </SectionReveal>
  );
}

function ServicesCatalog({ services: list }: { services: Service[] }) {
  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <SectionReveal className="grid gap-8 border-y border-line py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Catalogo completo
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Cada servico mostra tempo, valor e o que voce recebe.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CatalogStat icon={<Scissors size={18} />} value={`${list.length}`} label="rituais ativos" />
            <CatalogStat icon={<Timer size={18} />} value="15-120" label="minutos por servico" />
            <CatalogStat icon={<BadgeCheck size={18} />} value="sem conta" label="para agendar" />
          </div>
        </SectionReveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {list.map((service, index) => (
            <CatalogServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>

        <SectionReveal className="mt-12 flex flex-col gap-5 border-t border-line pt-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brass">
              Nao decidiu ainda?
            </p>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
              Escolha o proximo horario disponivel e ajuste o servico antes da
              confirmacao final.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/agendamento">Abrir agenda</ButtonLink>
            <ButtonLink href="/equipe" variant="secondary">
              Escolher barbeiro
            </ButtonLink>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

function CatalogServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <SectionReveal
      delay={index * 0.035}
      className="group rounded-[1.75rem] border border-line bg-white/[0.035] p-5 transition hover:border-brass/45 hover:bg-white/[0.055] sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                serviceAccents[index % serviceAccents.length],
              )}
            >
              {service.highlight}
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">
              {service.durationMinutes} min
            </span>
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{service.name}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{service.description}</p>
        </div>

        <div className="shrink-0 rounded-2xl border border-line px-4 py-3 sm:text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Valor</p>
          <p className="mt-1 text-2xl font-semibold text-brass">
            {formatCurrency(service.priceCents)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 lg:grid-cols-3">
        <ServiceDetail icon={<Sparkles size={16} />} label="Ideal para" text={service.idealFor} />
        <ServiceDetail icon={<Check size={16} />} label="Inclui" text={service.includes.join(", ")} />
        <ServiceDetail icon={<Clock3 size={16} />} label="Resultado" text={service.result} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Pode agendar sem cadastro.</p>
        <ButtonLink href={`/agendamento?service=${service.slug}`} className="sm:min-w-56">
          Agendar {service.name}
        </ButtonLink>
      </div>
    </SectionReveal>
  );
}

function ServiceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-paper/48">{label}</p>
      <p className="mt-2 text-lg font-semibold text-paper">{value}</p>
    </div>
  );
}

function CatalogStat({
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

function ServiceDetail({
  icon,
  label,
  text,
}: {
  icon: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-brass">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

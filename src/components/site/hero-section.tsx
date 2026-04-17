import Image from "next/image";
import { Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { brand, heroImage } from "@/lib/site-data";
import { SectionReveal } from "@/components/site/section-reveal";
import { NextAvailableCTA } from "@/components/site/next-available-cta";
import { PremiumBadge } from "@/components/ui/premium-badge";

export function HeroSection() {
  return (
    <section className="premium-noise relative min-h-[100svh] overflow-hidden">
      <Image
        src={heroImage}
        alt="Barbeiro finalizando corte premium em uma cadeira de barbearia"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="hero-image-overlay absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <SectionReveal className="max-w-3xl">
          <PremiumBadge className="mb-6">{brand.tagline}</PremiumBadge>
          <h1 className="text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
            {brand.name}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Corte, barba e acabamento com agenda simples: escolha o servico,
            o profissional e confirme em poucos cliques.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/agendamento" className="sm:min-w-48">
              Agendar agora
            </ButtonLink>
            <ButtonLink href="/servicos" variant="secondary" className="sm:min-w-48">
              Ver servicos
            </ButtonLink>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Clock3, label: "Sem espera", value: "agenda pontual" },
              { icon: ShieldCheck, label: "Seguro", value: "RLS + Supabase" },
              { icon: Sparkles, label: "Premium", value: "ritual completo" },
            ].map((item) => (
              <div key={item.label} className="glass-line rounded-2xl p-4">
                <item.icon className="mb-3 text-brass" size={20} aria-hidden="true" />
                <dt className="text-sm font-semibold">{item.label}</dt>
                <dd className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </SectionReveal>
      </div>

      <div className="absolute bottom-8 right-8 z-10 hidden max-w-xs lg:block">
        <NextAvailableCTA />
      </div>
    </section>
  );
}

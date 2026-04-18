import Image from "next/image";
import { Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { brand, heroImage } from "@/lib/site-data";
import { NextAvailableCTA } from "@/components/site/next-available-cta";
import { PremiumBadge } from "@/components/ui/premium-badge";

export function HeroSection() {
  return (
    <section className="premium-noise relative min-h-[92svh] overflow-hidden sm:min-h-[100svh]">
      <Image
        src={heroImage}
        alt="Barbeiro finalizando corte premium em uma cadeira de barbearia"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[58%_center] sm:object-center"
      />
      <div className="hero-image-overlay absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-7xl items-end px-4 pb-28 pt-28 sm:min-h-[100svh] sm:px-6 sm:pb-20 lg:items-center lg:px-8">
        <div className="max-w-3xl">
          <PremiumBadge className="mb-4 sm:mb-6">{brand.tagline}</PremiumBadge>
          <h1 className="text-balance text-4xl font-semibold leading-[0.94] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
            {brand.name}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:mt-7 sm:text-xl sm:leading-8">
            Corte, barba e acabamento com agenda simples: escolha o servico,
            o profissional e confirme em poucos cliques.
          </p>

          <div className="mt-8 hidden flex-col gap-3 sm:flex sm:flex-row">
            <ButtonLink href="/agendamento" className="sm:min-w-48">
              Agendar agora
            </ButtonLink>
            <ButtonLink href="/servicos" variant="secondary" className="sm:min-w-48">
              Ver servicos
            </ButtonLink>
          </div>

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-2 sm:mt-12 sm:max-w-2xl sm:gap-3">
            {[
              { icon: Clock3, label: "Sem espera", value: "agenda pontual" },
              { icon: ShieldCheck, label: "Seguro", value: "RLS + Supabase" },
              { icon: Sparkles, label: "Premium", value: "ritual completo" },
            ].map((item) => (
              <div key={item.label} className="glass-line rounded-xl p-3 sm:rounded-2xl sm:p-4">
                <item.icon className="mb-3 hidden text-brass sm:block" size={20} aria-hidden="true" />
                <dt className="text-xs font-semibold sm:text-sm">{item.label}</dt>
                <dd className="mt-1 hidden text-xs uppercase tracking-[0.2em] text-muted sm:block">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 z-10 hidden max-w-xs lg:block">
        <NextAvailableCTA />
      </div>
    </section>
  );
}

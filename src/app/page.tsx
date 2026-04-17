import { BarbersSection } from "@/components/site/barbers-section";
import { CTASection } from "@/components/site/cta-section";
import { FAQAccordion } from "@/components/site/faq-accordion";
import { GallerySection } from "@/components/site/gallery-section";
import { HeroSection } from "@/components/site/hero-section";
import { PublicShell } from "@/components/site/public-shell";
import { ServicesGrid } from "@/components/site/services-grid";
import { Testimonials } from "@/components/site/testimonials";

export default function HomePage() {
  return (
    <PublicShell>
      <HeroSection />
      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Como funciona
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Agendamento curto, atendimento sem correria.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Escolha o servico", "Preco e duracao aparecem antes da confirmacao."],
              ["2", "Defina barbeiro e hora", "Veja apenas horarios realmente disponiveis."],
              ["3", "Confirme", "Com conta ou sem conta, sem cadastro obrigatorio."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-[1.5rem] border border-line bg-white/[0.03] p-5">
                <span className="font-mono text-sm text-brass">{step}</span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ServicesGrid limit={3} />
      <BarbersSection limit={3} />
      <GallerySection />
      <Testimonials />
      <FAQAccordion />
      <CTASection />
    </PublicShell>
  );
}

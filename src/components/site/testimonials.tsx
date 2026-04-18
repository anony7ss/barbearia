import { SectionReveal } from "@/components/site/section-reveal";
import { TestimonialsCarousel } from "@/components/site/testimonials-carousel";
import { testimonials } from "@/lib/site-data";
import { getPublicReviewTestimonials } from "@/lib/server/reviews";

export async function Testimonials() {
  const realTestimonials = await getPublicReviewTestimonials();
  const items = realTestimonials.length > 0 ? realTestimonials : testimonials;
  const ratingAverage = realTestimonials.length > 0
    ? realTestimonials.reduce((sum, item) => sum + item.rating, 0) / realTestimonials.length
    : 4.9;

  return (
    <section className="bg-paper text-ink">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionReveal className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-oxblood">
              Avaliacoes
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Pontualidade e acabamento aparecem nos detalhes.
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.05} className="max-w-xs border-l border-ink/10 pl-5">
            <p className="text-3xl font-semibold">{ratingAverage.toFixed(1)}/5</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {realTestimonials.length > 0
                ? "Media das avaliacoes publicas de clientes atendidos."
                : "Avaliacoes recorrentes de clientes que voltam pela agenda simples e pelo acabamento consistente."}
            </p>
          </SectionReveal>
        </div>

        <div className="mt-12">
          <TestimonialsCarousel items={items} />
        </div>
      </div>
    </section>
  );
}

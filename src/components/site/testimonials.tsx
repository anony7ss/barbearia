import { Quote } from "lucide-react";
import { SectionReveal } from "@/components/site/section-reveal";
import { testimonials } from "@/lib/site-data";

export function Testimonials() {
  return (
    <section className="bg-paper text-ink">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-oxblood">
            Avaliacoes
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Pontualidade e acabamento aparecem nos detalhes.
          </h2>
        </SectionReveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <SectionReveal key={testimonial.author} delay={index * 0.05} className="rounded-[1.75rem] border border-ink/10 bg-white p-6">
              <Quote className="text-brass" size={28} aria-hidden="true" />
              <blockquote className="mt-6 text-lg leading-8">
                “{testimonial.quote}”
              </blockquote>
              <div className="mt-8 border-t border-ink/10 pt-4">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-ink/60">{testimonial.detail}</p>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

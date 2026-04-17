import Image from "next/image";
import { SectionReveal } from "@/components/site/section-reveal";
import { galleryImages } from "@/lib/site-data";

export function GallerySection() {
  return (
    <section className="bg-[#0a0908]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionReveal className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Ambiente
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Um espaco feito para pausa, precisao e presenca.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              Madeira escura, luz quente, cadeira confortavel e uma operacao
              sem improviso: o atendimento comeca antes da navalha.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={image}
                className={
                  index === 0
                    ? "relative col-span-2 aspect-[16/8] overflow-hidden rounded-[2rem]"
                    : "relative aspect-[4/5] overflow-hidden rounded-[2rem]"
                }
              >
                <Image
                  src={image}
                  alt="Ambiente e detalhes de uma barbearia premium"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

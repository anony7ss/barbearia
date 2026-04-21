import { SectionReveal } from "@/components/site/section-reveal";
import { galleryImages } from "@/lib/site-data";
import type { PublicGalleryAsset } from "@/features/barbers/public-data";

export function GallerySection({ items }: { items?: PublicGalleryAsset[] }) {
  const list = items?.length
    ? items
    : galleryImages.map((image, index) => ({
        id: image,
        imageUrl: image,
        altText: `Ambiente e detalhes da barbearia ${index + 1}`,
        caption: null,
        barberName: null,
        barberSlug: null,
        isCover: index === 0,
      }));

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
            {list.map((image, index) => (
              <div
                key={image.id}
                className={
                  index === 0
                    ? "relative col-span-2 aspect-[16/8] overflow-hidden rounded-[2rem]"
                    : "relative aspect-[4/5] overflow-hidden rounded-[2rem]"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={image.altText}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {image.caption || image.barberName ? (
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-background/72 px-4 py-3 text-sm backdrop-blur">
                    <p className="font-semibold">{image.caption ?? image.barberName}</p>
                    {image.caption && image.barberName ? <p className="mt-1 text-xs text-muted">{image.barberName}</p> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

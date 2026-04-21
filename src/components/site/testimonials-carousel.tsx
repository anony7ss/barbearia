"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  author: string;
  detail: string;
  rating?: number;
};

const stars = [0, 1, 2, 3, 4];

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const scrollToIndex = useCallback(
    (index: number) => {
      const scroller = scrollerRef.current;
      if (!scroller || count === 0) return;

      const nextIndex = (index + count) % count;
      const target = scroller.children.item(nextIndex) as HTMLElement | null;
      if (!target) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      scroller.scrollTo({
        left: targetRect.left - scrollerRect.left + scroller.scrollLeft,
        behavior: "smooth",
      });
      setActiveIndex(nextIndex);
    },
    [count],
  );

  const syncActiveIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Array.from(scroller.children).forEach((child, index) => {
      const item = child as HTMLElement;
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - viewportCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  }, []);

  const handleScroll = useCallback(() => {
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      syncActiveIndex();
    });
  }, [syncActiveIndex]);

  useEffect(() => {
    if (paused || count <= 1) return;

    const interval = window.setInterval(() => {
      scrollToIndex(activeIndex + 1);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeIndex, count, paused, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (count === 0) return null;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Avaliacoes de clientes"
      >
        {items.map((testimonial, index) => (
          <article
            key={`${testimonial.author}-${testimonial.detail}-${index}`}
            className="min-w-[86%] snap-start rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(17,13,8,0.08)] sm:min-w-[calc(50%-0.5rem)] lg:min-w-[calc(33.333%-0.75rem)]"
          >
            <div className="flex items-start justify-between gap-4">
              <Quote className="text-brass" size={28} aria-hidden="true" />
              <div className="flex gap-1 text-brass" aria-label={`${testimonial.rating ?? 5} estrelas`}>
                {stars.map((star) => (
                  <Star
                    key={star}
                    size={15}
                    fill={star < (testimonial.rating ?? 5) ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <blockquote className="mt-6 text-lg leading-8">
              &quot;{testimonial.quote}&quot;
            </blockquote>
            <div className="mt-8 border-t border-ink/10 pt-4">
              <p className="font-semibold">{testimonial.author}</p>
              <p className="text-sm text-ink/60">{testimonial.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            className="grid size-11 place-items-center rounded-full border border-ink/10 bg-white text-ink transition hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            aria-label="Avaliacao anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            className={cn(
              "grid size-11 place-items-center rounded-full border border-ink/10 bg-ink text-paper transition",
              "hover:border-brass hover:bg-brass hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
            )}
            aria-label="Proxima avaliacao"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function FAQAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            FAQ
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
            Respostas diretas para marcar sem friccao.
          </h2>
        </div>
        <div className="grid gap-3">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.question} className="rounded-3xl border border-line bg-white/[0.03]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-semibold"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  {faq.question}
                  <ChevronDown
                    size={18}
                    className={cn("shrink-0 transition", isOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-5 text-sm leading-6 text-muted">
                    {faq.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { brand } from "@/lib/site-data";

export type LegalSection = {
  id: string;
  title: string;
  summary: string;
  items: string[];
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  summary: string[];
  sections: LegalSection[];
  closingNote: string;
};

export function LegalDocument({
  eyebrow,
  title,
  intro,
  updatedAt,
  summary,
  sections,
  closingNote,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-7xl px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <header className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brass">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            {intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span className="rounded-full border border-line bg-smoke px-4 py-3">
              Atualizado em {updatedAt}
            </span>
            <a
              href={`mailto:${brand.email}`}
              className="rounded-full border border-line bg-smoke px-4 py-3 transition hover:border-brass/50 hover:text-foreground"
            >
              {brand.email}
            </a>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-line bg-smoke p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Resumo rapido
          </p>
          <ul className="mt-5 grid gap-4 text-sm leading-6 text-muted">
            {summary.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </header>

      <div className="mt-14 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <nav
          aria-label="Indice da pagina"
          className="h-fit rounded-[1.5rem] border border-line bg-[#0f0e0c] p-4 lg:sticky lg:top-28"
        >
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-brass">
            Nesta pagina
          </p>
          <div className="mt-4 grid gap-1">
            {sections.map((section, index) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-foreground"
              >
                <span className="mr-2 font-mono text-xs text-brass">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </Link>
            ))}
          </div>
        </nav>

        <div className="grid gap-5">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-32 rounded-[2rem] border border-line bg-smoke p-6 sm:p-8"
            >
              <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                    Secao {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {section.title}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted">
                  {section.summary}
                </p>
              </div>

              <ul className="mt-6 grid gap-4 text-sm leading-7 text-muted">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 size-1.5 shrink-0 rounded-full bg-brass/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <section className="mt-10 grid gap-6 rounded-[2rem] border border-brass/25 bg-brass/10 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            Duvidas sobre dados, conta ou agendamento?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            {closingNote}
          </p>
        </div>
        <ButtonLink href="/contato">Falar com a barbearia</ButtonLink>
      </section>
    </article>
  );
}

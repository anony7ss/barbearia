import { ButtonLink } from "@/components/ui/button-link";
import { PublicShell } from "@/components/site/public-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[78svh] max-w-4xl flex-col items-start justify-center px-4 py-32 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
          Essa pagina saiu da agenda.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
          O caminho nao existe ou foi movido. Volte para a home ou marque um horario em poucos cliques.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/agendamento">Agendar agora</ButtonLink>
          <ButtonLink href="/" variant="secondary">Voltar para home</ButtonLink>
        </div>
      </section>
    </PublicShell>
  );
}

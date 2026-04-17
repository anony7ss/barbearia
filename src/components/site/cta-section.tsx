import { ButtonLink } from "@/components/ui/button-link";

export function CTASection() {
  return (
    <section className="bg-paper px-4 py-20 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-ink px-6 py-14 text-paper shadow-[0_30px_120px_rgba(0,0,0,0.18)] sm:px-10 lg:flex lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Agenda inteligente
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em]">
            Seu proximo horario pode estar a poucos cliques.
          </h2>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <ButtonLink href="/agendamento">Agendar agora</ButtonLink>
          <ButtonLink href="/cadastro" variant="secondary">
            Criar conta
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

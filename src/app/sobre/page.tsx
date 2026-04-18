import type { Metadata } from "next";
import Image from "next/image";
import { CalendarCheck, Clock3, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/site/public-shell";
import { CTASection } from "@/components/site/cta-section";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Historia, proposta e ambiente da Corte Nobre Barbearia.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Sobre
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Alto nivel sem teatro.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              A Corte Nobre nasceu para homens que querem um atendimento
              preciso, bonito e pontual. Sem fila improvisada, sem pressa no
              acabamento e sem ritual vazio: cada etapa tem funcao.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/agendamento">Agendar horario</ButtonLink>
              <ButtonLink href="/equipe" variant="secondary">
                Conhecer equipe
              </ButtonLink>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <AboutStat icon={<CalendarCheck size={17} />} value="agenda" label="objetiva" />
              <AboutStat icon={<ShieldCheck size={17} />} value="dados" label="protegidos" />
              <AboutStat icon={<Scissors size={17} />} value="acabamento" label="consistente" />
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
            <Image
              src="/images/barbershop-detail.svg"
              alt="Cadeira e bancada de uma barbearia premium"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 py-20 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-oxblood">
              Proposta
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              O premium esta na execucao, nao no exagero.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Principle
              icon={<Clock3 size={18} />}
              title="Pontualidade"
              text="Agenda online com horarios reais, intervalo controlado e menos espera."
            />
            <Principle
              icon={<Sparkles size={18} />}
              title="Leitura de estilo"
              text="Servico escolhido pelo resultado esperado, rotina e tipo de acabamento."
            />
            <Principle
              icon={<ShieldCheck size={18} />}
              title="Confiança"
              text="Consulta segura, historico para clientes logados e dados protegidos."
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Experiencia
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-4">
            {[
              ["01", "Escolha sem pressao", "Servico, barbeiro e horario aparecem antes da confirmacao."],
              ["02", "Chegada organizada", "O horario e preparado para evitar fila e improviso."],
              ["03", "Execucao precisa", "Corte, barba ou ritual completo com foco em acabamento limpo."],
              ["04", "Retorno facil", "Conta opcional para repetir preferencias e reagendar mais rapido."],
            ].map(([step, title, text]) => (
              <div key={step} className="border-t border-line pt-5">
                <span className="font-mono text-sm text-brass">{step}</span>
                <h3 className="mt-5 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </PublicShell>
  );
}

function AboutStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="border-t border-line pt-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-4 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  );
}

function Principle({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-ink/10 bg-white p-5">
      <div className="text-oxblood">{icon}</div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/68">{text}</p>
    </div>
  );
}

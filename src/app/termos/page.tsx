import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Termos",
  description: "Termos de uso e regras de agendamento da Corte Nobre.",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-4xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-semibold tracking-[-0.04em]">Termos de uso</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted">
          <p>
            Ao agendar, o cliente confirma que os dados informados estao
            corretos e aceita receber comunicacoes transacionais sobre o horario.
          </p>
          <p>
            Cancelamentos e reagendamentos seguem a antecedencia configurada
            pela administracao. Horarios podem ser bloqueados em caso de
            manutencao, feriados, folgas ou necessidade operacional.
          </p>
          <p>
            A barbearia pode recusar agendamentos abusivos, duplicados ou
            suspeitos, sempre preservando uma comunicacao clara com o cliente.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

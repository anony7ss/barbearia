import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Politica de privacidade",
  description: "Politica de privacidade da Corte Nobre Barbearia.",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalPage title="Politica de privacidade" />
    </PublicShell>
  );
}

function LegalPage({ title }: { title: string }) {
  return (
    <article className="mx-auto max-w-4xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <h1 className="text-5xl font-semibold tracking-[-0.04em]">{title}</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-muted">
        <p>
          Coletamos apenas dados necessarios para operar agendamentos, contato,
          autenticacao e atendimento: nome, email, telefone, historico de
          horarios e preferencias informadas pelo cliente.
        </p>
        <p>
          Dados de clientes sao protegidos por controles de acesso, Row Level
          Security no Supabase e validacao server-side. Administradores acessam
          somente informacoes necessarias para operacao da barbearia.
        </p>
        <p>
          Links de consulta para convidados usam codigo e token seguro para
          limitar acesso a um unico agendamento. Nao vendemos dados pessoais.
        </p>
      </div>
    </article>
  );
}

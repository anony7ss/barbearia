import { Mail, MessageCircleMore } from "lucide-react";
import { ContactMessagesManager } from "@/components/admin/contact-messages-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type ContactSearchParams = Promise<{ message?: string | string[] }>;

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: ContactSearchParams;
}) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id,name,email,phone,message,status,created_at")
    .order("created_at", { ascending: false })
    .limit(240);

  if (error) {
    throw error;
  }

  const focusMessageId = Array.isArray(query.message) ? query.message[0] : query.message;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Contato</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Caixa de entrada operacional.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Veja mensagens enviadas pelo site, responda por email ou WhatsApp e organize o fluxo de retorno.
          </p>
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <div className="flex items-center gap-2 text-brass">
            <Mail size={17} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Email</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Ideal para respostas consultivas, orcamentos, retorno formal e confirmacoes com mais contexto.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <div className="flex items-center gap-2 text-brass">
            <MessageCircleMore size={17} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">WhatsApp</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Melhor para retorno rapido, ajustes de horario, duvidas urgentes e fechamento direto do atendimento.
          </p>
        </div>
      </section>

      <ContactMessagesManager
        initialMessages={(messages ?? []) as never}
        focusMessageId={focusMessageId}
      />
    </main>
  );
}

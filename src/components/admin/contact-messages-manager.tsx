"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, MessageCircleMore, Search } from "lucide-react";
import { AdminPaginationButtons, clampPage, pageCount, pageSlice } from "@/components/admin/pagination-buttons";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type ContactStatus = "new" | "read" | "archived";

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus | string;
  created_at: string;
};

const statusOptions: Array<{ value: ContactStatus; label: string }> = [
  { value: "new", label: "Nova" },
  { value: "read", label: "Lida" },
  { value: "archived", label: "Arquivada" },
];

const messagePageSize = 12;

export function ContactMessagesManager({
  initialMessages,
  focusMessageId,
}: {
  initialMessages: ContactMessageRow[];
  focusMessageId?: string;
}) {
  const [messages, setMessages] = useState(() => prioritizeFocusMessage(initialMessages, focusMessageId));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleMessages = useMemo(() => {
    const term = query.trim().toLowerCase();

    return messages.filter((message) => {
      if (statusFilter !== "all" && message.status !== statusFilter) return false;

      const haystack = [
        message.name,
        message.email,
        message.phone,
        message.message,
        message.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !term || haystack.includes(term);
    });
  }, [messages, query, statusFilter]);

  const totalPages = pageCount(visibleMessages.length, messagePageSize);
  const currentPage = clampPage(page, totalPages);
  const paginatedMessages = pageSlice(visibleMessages, currentPage, messagePageSize);

  async function updateStatus(messageId: string, status: ContactStatus) {
    setError(null);
    setUpdatingId(messageId);

    const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setUpdatingId(null);

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status da mensagem.");
      return;
    }

    const payload = await response.json();
    setMessages((current) => current.map((message) => (message.id === messageId ? payload.message : message)));
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <MessageStat label="Novas" value={messages.filter((message) => message.status === "new").length} />
          <MessageStat label="Lidas" value={messages.filter((message) => message.status === "read").length} />
          <MessageStat label="Arquivadas" value={messages.filter((message) => message.status === "archived").length} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
            <input
              id="admin-contact-search"
              name="admin_contact_search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome, email, telefone ou conteudo"
              className="field field-search w-full"
            />
          </div>
          <select
            id="admin-contact-status-filter"
            name="admin_contact_status_filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="field w-full"
          >
            <option value="all">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">{visibleMessages.length} de {messages.length} mensagens</p>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {visibleMessages.length ? (
        <div className="grid gap-3">
          {paginatedMessages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "rounded-[1.5rem] border border-line bg-smoke p-5 transition",
                focusMessageId === message.id && "border-brass/60 shadow-[0_18px_55px_rgba(193,150,85,0.12)]",
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{message.name}</h2>
                    <StatusBadge status={message.status} />
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-muted">
                    <p>{message.email}</p>
                    <p>{message.phone || "Sem telefone informado"}</p>
                    <p>{formatDateTime(message.created_at)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildMailtoLink(message)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                  >
                    <Mail size={15} aria-hidden="true" />
                    Responder por email
                  </a>
                  {message.phone ? (
                    <a
                      href={buildWhatsAppLink(message)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                    >
                      <MessageCircleMore size={15} aria-hidden="true" />
                      WhatsApp
                    </a>
                  ) : null}
                  <div className="relative">
                    {updatingId === message.id ? (
                      <Loader2
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
                        aria-hidden="true"
                      />
                    ) : null}
                    <select
                      value={message.status}
                      onChange={(event) => updateStatus(message.id, event.target.value as ContactStatus)}
                      disabled={updatingId === message.id}
                      className={cn("field min-w-40", updatingId === message.id && "pl-9")}
                      aria-label={`Alterar status da mensagem de ${message.name}`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-line bg-background/45 p-4 text-sm leading-7 text-foreground">
                {message.message}
              </div>
            </article>
          ))}

          <AdminPaginationButtons
            currentPage={currentPage}
            totalPages={totalPages}
            label="mensagens de contato"
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState title="Nenhuma mensagem encontrada" description="Ajuste a busca ou o status para localizar contatos." />
      )}
    </div>
  );
}

function prioritizeFocusMessage(messages: ContactMessageRow[], focusMessageId?: string) {
  if (!focusMessageId) return messages;
  const focused = messages.find((message) => message.id === focusMessageId);
  if (!focused) return messages;
  return [focused, ...messages.filter((message) => message.id !== focusMessageId)];
}

function buildMailtoLink(message: ContactMessageRow) {
  const subject = encodeURIComponent("Resposta da Corte Nobre Barbearia");
  const body = encodeURIComponent(`Ola, ${message.name}.\n\nRecebemos sua mensagem e estamos retornando por aqui.\n\n`);
  return `mailto:${message.email}?subject=${subject}&body=${body}`;
}

function buildWhatsAppLink(message: ContactMessageRow) {
  const digits = normalizePhone(message.phone);
  const text = encodeURIComponent(`Ola, ${message.name}. Aqui e da Corte Nobre. Recebemos sua mensagem e estamos retornando por aqui.`);
  return `https://wa.me/55${digits}?text=${text}`;
}

function normalizePhone(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function MessageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    new: "border-brass/30 bg-brass/12 text-brass",
    read: "border-line bg-background/45 text-muted",
    archived: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  };

  const labels: Record<string, string> = {
    new: "Nova",
    read: "Lida",
    archived: "Arquivada",
  };

  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]", classes[status] ?? classes.read)}>
      {labels[status] ?? status}
    </span>
  );
}

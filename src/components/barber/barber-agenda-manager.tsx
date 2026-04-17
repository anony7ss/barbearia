"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Phone,
  Search,
  TimerReset,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
type ViewMode = "today" | "upcoming" | "history" | "all";
type StatusFilter = AppointmentStatus | "all";

type BarberAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  internal_notes: string | null;
  services?: { name?: string; duration_minutes?: number; price_cents?: number } | null;
  barbers?: { name?: string } | null;
};

type PatchBody = {
  status?: "confirmed" | "completed" | "no_show";
  internal_notes?: string;
};

const activeStatuses = new Set<AppointmentStatus>(["pending", "confirmed"]);

export function BarberAgendaManager({
  barberName,
  appointments,
  todayStart,
}: {
  barberName: string;
  appointments: BarberAppointment[];
  todayStart: string;
}) {
  const [items, setItems] = useState(appointments);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(appointments.map((appointment) => [appointment.id, appointment.internal_notes ?? ""])),
  );

  const now = Date.now();
  const todayWindow = useMemo(() => {
    const start = new Date(todayStart).getTime();
    return { start, end: start + 24 * 60 * 60 * 1000 };
  }, [todayStart]);

  const today = useMemo(
    () => items.filter((item) => isInside(item.starts_at, todayWindow.start, todayWindow.end)),
    [items, todayWindow],
  );

  const upcoming = useMemo(
    () => items.filter((item) => new Date(item.starts_at).getTime() >= now && activeStatuses.has(item.status)),
    [items, now],
  );

  const history = useMemo(
    () => items.filter((item) => new Date(item.starts_at).getTime() < now || !activeStatuses.has(item.status)),
    [items, now],
  );

  const focusAppointment = today.find((item) => {
    const start = new Date(item.starts_at).getTime();
    const end = new Date(item.ends_at).getTime();
    return start <= now && end >= now && activeStatuses.has(item.status);
  }) ?? upcoming[0] ?? null;

  const filteredAppointments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = view === "today" ? today : view === "upcoming" ? upcoming : view === "history" ? history : items;

    return base.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      const text = [
        appointment.customer_name,
        appointment.customer_phone,
        appointment.customer_email,
        appointment.notes,
        appointment.internal_notes,
        serviceName(appointment),
        statusLabel(appointment.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [history, items, query, statusFilter, today, upcoming, view]);

  async function patchAppointment(id: string, body: PatchBody) {
    setSavingId(id);
    setMessage(null);

    const response = await fetch(`/api/barber/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSavingId(null);

    if (!response.ok) {
      setMessage({ tone: "error", text: "Nao foi possivel salvar. Verifique permissao e tente novamente." });
      return;
    }

    const payload = await response.json();
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...payload.appointment } : item)));
    if (body.internal_notes !== undefined) {
      setNoteDrafts((current) => ({ ...current, [id]: body.internal_notes ?? "" }));
      setOpenNoteId(null);
    }
    setMessage({ tone: "success", text: "Alteracao salva." });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-5 rounded-[1.5rem] border border-line bg-smoke/85 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brass">Area do barbeiro</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Agenda de {barberName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Visao restrita a sua agenda, com foco em atendimento, notas internas e status do dia.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeaderMetric label="Hoje" value={today.length} />
              <HeaderMetric label="Ativos" value={today.filter((item) => activeStatuses.has(item.status)).length} />
              <HeaderMetric label="Concluidos" value={today.filter((item) => item.status === "completed").length} />
            </div>
          </div>

          <FocusPanel
            appointment={focusAppointment}
            saving={savingId === focusAppointment?.id}
            onPatch={patchAppointment}
          />
        </header>

        {message ? (
          <p
            className={cn(
              "rounded-2xl border p-3 text-sm",
              message.tone === "success"
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                : "border-red-300/25 bg-red-300/10 text-red-100",
            )}
          >
            {message.text}
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<CalendarDays size={17} />} label="Agenda do dia" value={today.length} detail="horarios carregados" tone="gold" />
          <StatCard icon={<Clock3 size={17} />} label="Proximos" value={upcoming.length} detail="pendentes ou confirmados" />
          <StatCard icon={<TimerReset size={17} />} label="Carga do dia" value={`${workMinutes(today)} min`} detail="tempo reservado" />
          <StatCard icon={<NotebookPen size={17} />} label="Notas internas" value={items.filter((item) => item.internal_notes).length} detail="observacoes registradas" />
          <StatCard icon={<AlertTriangle size={17} />} label="No-shows" value={items.filter((item) => item.status === "no_show").length} detail="na janela carregada" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Agenda operacional</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Atendimentos filtrados</h2>
                </div>
                <p className="text-sm text-muted">{filteredAppointments.length} de {items.length} horarios</p>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar cliente, telefone, servico ou nota"
                    className="field field-search w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setView(option.value)}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-semibold transition",
                        view === option.value
                          ? "border-brass bg-brass text-ink"
                          : "border-line text-muted hover:border-brass hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                      statusFilter === option.value
                        ? "border-brass bg-brass/14 text-brass"
                        : "border-line text-muted hover:border-brass/45 hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAppointments.length ? (
              <div className="grid gap-3">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    saving={savingId === appointment.id}
                    noteOpen={openNoteId === appointment.id}
                    noteDraft={noteDrafts[appointment.id] ?? ""}
                    onToggleNote={() => setOpenNoteId((current) => (current === appointment.id ? null : appointment.id))}
                    onNoteChange={(value) => setNoteDrafts((current) => ({ ...current, [appointment.id]: value }))}
                    onPatch={patchAppointment}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel title="Nenhum atendimento encontrado" description="Ajuste busca, periodo ou status para ver outros horarios." />
            )}
          </div>

          <aside className="grid content-start gap-4">
            <DayTimeline appointments={today} now={now} />
            <QueuePanel appointments={upcoming.slice(0, 8)} />
            <QuickRules />
          </aside>
        </section>
      </main>
    </div>
  );
}

function FocusPanel({
  appointment,
  saving,
  onPatch,
}: {
  appointment: BarberAppointment | null;
  saving: boolean;
  onPatch: (id: string, body: PatchBody) => Promise<void>;
}) {
  if (!appointment) {
    return (
      <section className="rounded-[1.25rem] border border-dashed border-line bg-background/35 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Proximo atendimento</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Agenda sem atendimento ativo.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Quando houver um cliente em andamento ou proximo, ele aparece aqui com acoes rapidas.</p>
      </section>
    );
  }

  const closed = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <section className="rounded-[1.25rem] border border-brass/25 bg-background/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Proximo atendimento</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{appointment.customer_name}</h2>
          <p className="mt-2 text-sm text-muted">{serviceName(appointment)} · {formatRange(appointment.starts_at, appointment.ends_at)}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <ContactLink href={telHref(appointment.customer_phone)} icon={<Phone size={15} />}>
          {appointment.customer_phone}
        </ContactLink>
        <ContactLink href={whatsappHref(appointment.customer_phone)} icon={<MessageCircle size={15} />} external>
          Chamar no WhatsApp
        </ContactLink>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving || closed}
          onClick={() => onPatch(appointment.id, { status: "completed" })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-4 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-45"
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Concluir
        </button>
        <button
          type="button"
          disabled={saving || closed}
          onClick={() => onPatch(appointment.id, { status: "no_show" })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300/30 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-45"
        >
          <XCircle size={16} aria-hidden="true" />
          No-show
        </button>
      </div>
    </section>
  );
}

function AppointmentCard({
  appointment,
  saving,
  noteOpen,
  noteDraft,
  onToggleNote,
  onNoteChange,
  onPatch,
}: {
  appointment: BarberAppointment;
  saving: boolean;
  noteOpen: boolean;
  noteDraft: string;
  onToggleNote: () => void;
  onNoteChange: (value: string) => void;
  onPatch: (id: string, body: PatchBody) => Promise<void>;
}) {
  const closed = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <article className="rounded-[1.25rem] border border-line bg-smoke p-4 transition hover:border-brass/35">
      <div className="grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)_280px] lg:items-start">
        <div className="rounded-2xl border border-line bg-background/45 p-3">
          <p className="font-mono text-xl font-semibold">{formatHour(appointment.starts_at)}</p>
          <p className="mt-1 text-xs text-muted">ate {formatHour(appointment.ends_at)}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-brass">{duration(appointment)} min</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="min-w-0 text-xl font-semibold tracking-[-0.02em]">{appointment.customer_name}</h3>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-2 text-sm text-muted">{serviceName(appointment)}</p>
          <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <span>Telefone: <strong className="font-semibold text-foreground">{appointment.customer_phone}</strong></span>
            <span>Email: <strong className="font-semibold text-foreground">{appointment.customer_email ?? "-"}</strong></span>
          </div>
          {appointment.notes ? (
            <p className="mt-4 rounded-2xl border border-line bg-background/45 p-3 text-sm leading-6 text-muted">
              Cliente: {appointment.notes}
            </p>
          ) : null}
          {appointment.internal_notes && !noteOpen ? (
            <p className="mt-3 text-sm text-muted">Nota interna registrada.</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "completed" })}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brass px-3 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-45"
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              Concluir
            </button>
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "no_show" })}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-300/30 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-45"
            >
              <XCircle size={15} aria-hidden="true" />
              No-show
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ContactLink href={telHref(appointment.customer_phone)} icon={<Phone size={15} />}>Ligar</ContactLink>
            <ContactLink href={whatsappHref(appointment.customer_phone)} icon={<MessageCircle size={15} />} external>WhatsApp</ContactLink>
          </div>
          <button
            type="button"
            onClick={onToggleNote}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
          >
            <NotebookPen size={15} aria-hidden="true" />
            {noteOpen ? "Fechar nota" : "Nota interna"}
          </button>
        </div>
      </div>

      {noteOpen ? (
        <div className="mt-4 grid gap-3 border-t border-line pt-4">
          <textarea
            value={noteDraft}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={3}
            placeholder="Preferencias, observacoes do atendimento ou cuidado para proxima visita"
            className="field min-h-24 w-full resize-none py-3 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => onPatch(appointment.id, { internal_notes: noteDraft })}
              className="min-h-10 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-55"
            >
              {saving ? "Salvando..." : "Salvar nota"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DayTimeline({ appointments, now }: { appointments: BarberAppointment[]; now: number }) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <div className="flex items-center gap-2 text-brass">
        <ListChecks size={17} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em]">Linha do dia</p>
      </div>
      <div className="mt-5 grid gap-3">
        {appointments.length ? (
          appointments.map((appointment) => {
            const active = new Date(appointment.starts_at).getTime() <= now && new Date(appointment.ends_at).getTime() >= now;
            return (
              <div key={appointment.id} className="grid grid-cols-[74px_1fr] gap-3">
                <div className="font-mono text-sm text-muted">{formatHour(appointment.starts_at)}</div>
                <div className={cn("rounded-2xl border p-3", active ? "border-brass bg-brass/10" : "border-line bg-background/45")}>
                  <p className="truncate font-semibold">{appointment.customer_name}</p>
                  <p className="mt-1 truncate text-xs text-muted">{serviceName(appointment)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm leading-6 text-muted">Sem horarios hoje.</p>
        )}
      </div>
    </section>
  );
}

function QueuePanel({ appointments }: { appointments: BarberAppointment[] }) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Proximos clientes</p>
      <div className="mt-4 grid gap-3">
        {appointments.length ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-2xl border border-line bg-background/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{appointment.customer_name}</p>
                  <p className="mt-1 truncate text-sm text-muted">{serviceName(appointment)}</p>
                </div>
                <p className="shrink-0 font-mono text-sm text-brass">{formatHour(appointment.starts_at)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted">Nenhum atendimento futuro ativo na janela.</p>
        )}
      </div>
    </section>
  );
}

function QuickRules() {
  return (
    <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Permissoes</p>
      <div className="mt-4 grid gap-3 text-sm text-muted">
        <p>Voce pode concluir, marcar no-show e registrar notas internas dos seus atendimentos.</p>
        <p>Dados financeiros gerais, roles e base completa de clientes continuam restritos ao admin.</p>
      </div>
    </section>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: "gold";
}) {
  return (
    <div className={cn("rounded-[1.5rem] border border-line p-5", tone === "gold" ? "bg-brass text-ink" : "bg-smoke")}>
      <div className="flex items-center gap-2">
        {icon}
        <p className={cn("text-xs font-semibold uppercase tracking-[0.18em]", tone === "gold" ? "text-ink/70" : "text-muted")}>{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className={cn("mt-1 text-sm", tone === "gold" ? "text-ink/70" : "text-muted")}>{detail}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-line bg-smoke p-6">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function ContactLink({
  href,
  icon,
  children,
  external,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
    >
      {icon}
      <span className="truncate">{children}</span>
    </a>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes: Record<AppointmentStatus, string> = {
    pending: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    confirmed: "border-brass/35 bg-brass/12 text-brass",
    completed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    cancelled: "border-red-300/25 bg-red-300/10 text-red-100",
    no_show: "border-zinc-400/25 bg-zinc-400/10 text-zinc-100",
  };

  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]", classes[status])}>
      {statusLabel(status)}
    </span>
  );
}

const viewOptions: Array<{ value: ViewMode; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "upcoming", label: "Proximos" },
  { value: "history", label: "Historico" },
  { value: "all", label: "Tudo" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluido" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "No-show" },
];

function statusLabel(status: AppointmentStatus) {
  const labels: Record<AppointmentStatus, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "No-show",
  };
  return labels[status];
}

function serviceName(appointment: BarberAppointment) {
  return appointment.services?.name ?? "Servico";
}

function duration(appointment: BarberAppointment) {
  return appointment.services?.duration_minutes ?? minutesBetween(appointment.starts_at, appointment.ends_at);
}

function workMinutes(appointments: BarberAppointment[]) {
  return appointments.reduce((total, appointment) => total + duration(appointment), 0);
}

function isInside(value: string, start: number, end: number) {
  const time = new Date(value).getTime();
  return time >= start && time < end;
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function telHref(phone: string) {
  return `tel:${digits(phone)}`;
}

function whatsappHref(phone: string) {
  const normalized = digits(phone);
  const withCountry = normalized.startsWith("55") ? normalized : `55${normalized}`;
  return `https://wa.me/${withCountry}`;
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatRange(start: string, end: string) {
  return `${formatHour(start)} - ${formatHour(end)}`;
}

"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  NotebookPen,
  Phone,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
type ViewMode = "today" | "upcoming" | "history" | "all";

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
  const [view, setView] = useState<ViewMode>("today");
  const [query, setQuery] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(appointments.map((appointment) => [appointment.id, appointment.internal_notes ?? ""])),
  );
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const todayWindow = useMemo(() => {
    const start = new Date(todayStart).getTime();
    return { start, end: start + 24 * 60 * 60 * 1000 };
  }, [todayStart]);
  const now = Date.now();

  const today = useMemo(
    () => items.filter((appointment) => isInside(appointment.starts_at, todayWindow.start, todayWindow.end)),
    [items, todayWindow],
  );
  const upcoming = useMemo(
    () => items.filter((appointment) => new Date(appointment.starts_at).getTime() >= now && activeStatuses.has(appointment.status)),
    [items, now],
  );
  const history = useMemo(
    () => items.filter((appointment) => new Date(appointment.starts_at).getTime() < now || !activeStatuses.has(appointment.status)),
    [items, now],
  );

  const activeToday = today.filter((appointment) => activeStatuses.has(appointment.status));
  const completedToday = today.filter((appointment) => appointment.status === "completed");
  const noShows = items.filter((appointment) => appointment.status === "no_show");
  const currentAppointment = today.find((appointment) => {
    const start = new Date(appointment.starts_at).getTime();
    const end = new Date(appointment.ends_at).getTime();
    return start <= now && end >= now && activeStatuses.has(appointment.status);
  });
  const nextAppointment = currentAppointment ?? upcoming[0] ?? null;

  const visibleAppointments = useMemo(() => {
    const base = selectedDateKey
      ? items.filter((appointment) => getDateKey(appointment.starts_at) === selectedDateKey)
      : view === "today"
        ? today
        : view === "upcoming"
          ? upcoming
          : view === "history"
            ? history
            : items;
    const term = query.trim().toLowerCase();

    if (!term) return base;

    return base.filter((appointment) => {
      const text = [
        appointment.customer_name,
        appointment.customer_phone,
        appointment.customer_email,
        serviceName(appointment),
        appointment.status,
        appointment.notes,
        appointment.internal_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });
  }, [history, items, query, selectedDateKey, today, upcoming, view]);

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
      setEditingNoteId(null);
    }

    setMessage({ tone: "success", text: "Alteracao salva." });
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Painel do barbeiro</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Operacao do dia.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Agenda de {barberName}, proximos clientes, status e notas internas dos seus atendimentos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashboardAction href="/agendamento">Abrir agenda publica</DashboardAction>
          <DashboardAction href="/meus-agendamentos">Meus horarios</DashboardAction>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "mb-5 rounded-2xl border p-3 text-sm",
            message.tone === "success"
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-red-300/25 bg-red-300/10 text-red-100",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarDays size={18} />} label="Agendamentos hoje" value={today.length} detail={`${activeToday.length} ativos`} tone="gold" />
        <MetricCard icon={<Clock3 size={18} />} label="Proximo horario" value={nextAppointment ? formatHour(nextAppointment.starts_at) : "--"} detail={nextAppointment?.customer_name ?? "sem atendimento"} />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Concluidos" value={completedToday.length} detail="hoje" tone="green" />
        <MetricCard icon={<UserRound size={18} />} label="Clientes na janela" value={uniqueCustomers(items)} detail={`${noShows.length} no-shows`} />
      </section>

      <BarberWeekCalendar
        appointments={items}
        todayStart={todayStart}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        onClearDate={() => setSelectedDateKey(null)}
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-xl font-semibold">Atendimentos</h2>
              <p className="mt-1 text-sm text-muted">Filtre, registre notas e atualize status sem sair da tela.</p>
            </div>
            <p className="text-sm text-muted">
              {visibleAppointments.length} de {items.length} horarios
              {selectedDateKey ? ` no dia ${formatDateFromKey(selectedDateKey)}` : ""}
            </p>
          </div>

          <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(240px,1fr)_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
              <input
                id="barber-appointment-search"
                name="barber_appointment_search"
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
                  onClick={() => {
                    setSelectedDateKey(null);
                    setView(option.value);
                  }}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-semibold transition",
                    !selectedDateKey && view === option.value
                      ? "border-brass bg-brass text-ink"
                      : "border-line text-muted hover:border-brass hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
              {selectedDateKey ? (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="min-h-11 rounded-full border border-brass/45 bg-brass/10 px-4 text-sm font-semibold text-brass transition hover:bg-brass hover:text-ink"
                >
                  Limpar dia
                </button>
              ) : null}
            </div>
          </div>

          {visibleAppointments.length ? (
            <div className="overflow-x-auto rounded-[1.25rem] border border-line">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Horario</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Servico</th>
                    <th className="px-4 py-3 font-semibold">Contato</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      saving={savingId === appointment.id}
                      noteOpen={editingNoteId === appointment.id}
                      noteDraft={noteDrafts[appointment.id] ?? ""}
                      onToggleNote={() => setEditingNoteId((current) => (current === appointment.id ? null : appointment.id))}
                      onNoteChange={(value) => setNoteDrafts((current) => ({ ...current, [appointment.id]: value }))}
                      onPatch={patchAppointment}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum atendimento encontrado" description="Ajuste a busca ou mude o filtro de periodo." />
          )}
        </div>

        <aside className="grid content-start gap-4">
          <NextAppointmentCard
            appointment={nextAppointment}
            saving={savingId === nextAppointment?.id}
            onPatch={patchAppointment}
          />

          <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Alertas</p>
            <div className="mt-4 grid gap-3">
              <Insight label="Restantes hoje" value={today.filter((appointment) => new Date(appointment.starts_at).getTime() >= now && activeStatuses.has(appointment.status)).length} />
              <Insight label="Sem nota interna" value={activeToday.filter((appointment) => !appointment.internal_notes).length} />
              <Insight label="No-show na janela" value={noShows.length} />
              <Insight label="Agenda carregada" value={items.length} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Permissoes</p>
            <div className="mt-4 grid gap-3 text-sm text-muted">
              <p>Voce pode concluir, marcar no-show e adicionar notas internas dos seus atendimentos.</p>
              <p>Financeiro geral, roles e base completa de clientes continuam restritos ao admin.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function BarberWeekCalendar({
  appointments,
  todayStart,
  selectedDateKey,
  onSelectDate,
  onClearDate,
}: {
  appointments: BarberAppointment[];
  todayStart: string;
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  onClearDate: () => void;
}) {
  const days = useMemo(() => buildWeekDays(todayStart), [todayStart]);
  const todayKey = getDateKey(todayStart);
  const selectedKey = selectedDateKey ?? todayKey;
  const weekKeys = new Set(days.map((day) => day.key));
  const weekAppointments = appointments.filter((appointment) => weekKeys.has(getDateKey(appointment.starts_at)));
  const weekActive = weekAppointments.filter((appointment) => activeStatuses.has(appointment.status)).length;

  return (
    <section className="mt-6 rounded-[1.5rem] border border-line bg-smoke p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Calendario do barbeiro</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Mapa rapido da semana</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Clique em um dia para filtrar a lista operacional abaixo. A visao mostra apenas seus atendimentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-line bg-background/45 px-3 py-2 text-muted">
            {weekActive} ativos na semana
          </span>
          {selectedDateKey ? (
            <button
              type="button"
              onClick={onClearDate}
              className="min-h-10 rounded-full border border-brass/45 px-4 font-semibold text-brass transition hover:bg-brass hover:text-ink"
            >
              Ver todos
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointments.filter((appointment) => getDateKey(appointment.starts_at) === day.key);
          const selected = selectedKey === day.key;
          const isToday = todayKey === day.key;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.key)}
              className={cn(
                "group min-h-48 rounded-[1.25rem] border p-4 text-left transition",
                "bg-background/45 hover:border-brass/55 hover:bg-background/70",
                selected
                  ? "border-brass bg-brass/10 shadow-[0_0_0_1px_rgba(193,150,85,0.18)]"
                  : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{day.weekday}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{day.day}</p>
                </div>
                {isToday ? (
                  <span className="rounded-full border border-brass/35 bg-brass/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brass">
                    Hoje
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-xl border border-line bg-black/18 px-3 py-2 transition group-hover:border-brass/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{formatHour(appointment.starts_at)}</span>
                      <span className={cn("size-2 rounded-full", calendarStatusDot(appointment.status))} aria-hidden="true" />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{appointment.customer_name}</p>
                  </div>
                ))}
                {dayAppointments.length > 3 ? (
                  <p className="rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
                    +{dayAppointments.length - 3} horarios
                  </p>
                ) : null}
                {!dayAppointments.length ? (
                  <p className="rounded-xl border border-dashed border-line px-3 py-4 text-xs text-muted">Dia livre</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AppointmentRow({
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
    <>
      <tr className="border-t border-line transition hover:bg-white/[0.025]">
        <td className="px-4 py-4">
          <p className="font-mono font-semibold">{formatHour(appointment.starts_at)}</p>
          <p className="mt-1 text-xs text-muted">ate {formatHour(appointment.ends_at)}</p>
        </td>
        <td className="px-4 py-4">
          <p className="font-semibold">{appointment.customer_name}</p>
          <p className="mt-1 text-xs text-muted">{appointment.customer_email ?? "Sem email"}</p>
        </td>
        <td className="px-4 py-4">
          <p className="font-semibold">{serviceName(appointment)}</p>
          <p className="mt-1 text-xs text-muted">{duration(appointment)} min</p>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <ContactAction href={telHref(appointment.customer_phone)} icon={<Phone size={14} />}>
              Ligar
            </ContactAction>
            <ContactAction href={whatsappHref(appointment.customer_phone)} icon={<MessageCircle size={14} />} external>
              WhatsApp
            </ContactAction>
          </div>
        </td>
        <td className="px-4 py-4">
          <StatusBadge status={appointment.status} />
        </td>
        <td className="px-4 py-4">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "completed" })}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brass px-4 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-45"
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              Concluir
            </button>
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "no_show" })}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300/30 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-45"
            >
              <XCircle size={15} aria-hidden="true" />
              No-show
            </button>
            <button
              type="button"
              onClick={onToggleNote}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              <NotebookPen size={15} aria-hidden="true" />
              Nota
            </button>
          </div>
        </td>
      </tr>
      {noteOpen ? (
        <tr className="border-t border-line bg-background/35">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-3">
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
          </td>
        </tr>
      ) : null}
    </>
  );
}

function NextAppointmentCard({
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
      <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Agora</p>
        <h2 className="mt-3 text-2xl font-semibold">Proximo horario</h2>
        <p className="mt-4 text-sm leading-6 text-muted">Nenhum atendimento futuro na janela carregada.</p>
      </div>
    );
  }

  const closed = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Agora</p>
      <h2 className="mt-3 text-2xl font-semibold">Proximo horario</h2>
      <div className="mt-4 rounded-2xl border border-line bg-background/55 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{formatHour(appointment.starts_at)} - {appointment.customer_name}</p>
            <p className="mt-2 text-sm text-muted">{serviceName(appointment)}</p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="mt-3 text-sm text-muted">{appointment.customer_phone}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
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
    </div>
  );
}

function DashboardAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
    >
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  );
}

function MetricCard({
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
  tone?: "gold" | "green";
}) {
  return (
    <div className={`rounded-[1.5rem] border border-line p-5 ${tone === "gold" ? "bg-brass text-ink" : tone === "green" ? "bg-evergreen/35" : "bg-smoke"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className={`mt-2 text-sm ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{detail}</p>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-background/45 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-line bg-background/35 p-6">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function ContactAction({
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
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3 text-xs font-semibold text-muted transition hover:border-brass hover:text-foreground"
    >
      {icon}
      {children}
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
    <span className={cn("inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em]", classes[status])}>
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

function uniqueCustomers(appointments: BarberAppointment[]) {
  return new Set(appointments.map((appointment) => appointment.customer_phone)).size;
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

const dayMs = 24 * 60 * 60 * 1000;
const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function buildWeekDays(todayStart: string) {
  const start = new Date(todayStart);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * dayMs);

    return {
      key: getDateKey(date),
      weekday: weekdayLabels[date.getDay()] ?? "Dia",
      day: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(date),
    };
  });
}

function getDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatDateFromKey(key: string) {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

function calendarStatusDot(status: AppointmentStatus) {
  const classes: Record<AppointmentStatus, string> = {
    pending: "bg-amber-300",
    confirmed: "bg-brass",
    completed: "bg-emerald-300",
    cancelled: "bg-red-300",
    no_show: "bg-zinc-300",
  };

  return classes[status];
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

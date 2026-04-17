"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Clock3, NotebookPen, UserRound, XCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

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
  const [message, setMessage] = useState<string | null>(null);

  const today = useMemo(() => {
    const start = new Date(todayStart).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const time = new Date(item.starts_at).getTime();
      return time >= start && time < end;
    });
  }, [items, todayStart]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => new Date(item.starts_at).getTime() >= now && ["pending", "confirmed"].includes(item.status));
  }, [items]);

  const noShows = items.filter((item) => item.status === "no_show").length;
  const completed = items.filter((item) => item.status === "completed").length;

  async function patchAppointment(id: string, body: { status?: "confirmed" | "completed" | "no_show"; internal_notes?: string }) {
    setSavingId(id);
    setMessage(null);

    const response = await fetch(`/api/barber/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSavingId(null);

    if (!response.ok) {
      setMessage("Nao foi possivel salvar. Verifique permissao e tente novamente.");
      return;
    }

    const payload = await response.json();
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...payload.appointment } : item)));
    setMessage("Alteracao salva.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-5 rounded-[1.5rem] border border-line bg-smoke/85 p-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brass">Area do barbeiro</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Agenda de {barberName}.</h1>
            <p className="mt-3 max-w-2xl text-muted">
              Visao operacional restrita a sua agenda. Sem acesso a financeiro geral, roles ou base completa de clientes.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-[1.25rem] border border-line bg-background/55">
            <HeaderMetric label="Hoje" value={today.length} />
            <HeaderMetric label="Concluidos" value={completed} />
            <HeaderMetric label="No-shows" value={noShows} />
          </div>
        </header>

        {message ? (
          <p className="rounded-2xl border border-line bg-smoke p-3 text-sm text-muted">{message}</p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<CalendarDays size={17} />} label="Agenda do dia" value={today.length} detail="atendimentos carregados" tone="gold" />
          <StatCard icon={<Clock3 size={17} />} label="Proximos" value={upcoming.length} detail="pendentes ou confirmados" />
          <StatCard icon={<UserRound size={17} />} label="Clientes" value={uniqueCustomers(items)} detail="na janela carregada" />
          <StatCard icon={<NotebookPen size={17} />} label="Notas internas" value={items.filter((item) => item.internal_notes).length} detail="observacoes registradas" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Hoje</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Atendimentos do dia</h2>
              </div>
              <p className="text-sm text-muted">{today.length} horarios</p>
            </div>

            {today.length ? (
              <div className="grid gap-3">
                {today.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} saving={savingId === appointment.id} onPatch={patchAppointment} />
                ))}
              </div>
            ) : (
              <EmptyPanel title="Nenhum atendimento hoje" description="Quando houver horarios para hoje, eles aparecem aqui." />
            )}
          </div>

          <aside className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Proximos clientes</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Fila operacional</h2>
            <div className="mt-5 grid gap-3">
              {upcoming.slice(0, 8).map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-line bg-background/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{appointment.customer_name}</p>
                      <p className="mt-1 text-sm text-muted">{serviceName(appointment)}</p>
                    </div>
                    <p className="font-mono text-sm text-brass">{formatHour(appointment.starts_at)}</p>
                  </div>
                  <p className="mt-3 text-xs text-muted">{appointment.customer_phone}</p>
                </div>
              ))}
              {!upcoming.length ? <EmptyPanel title="Sem proximos clientes" description="Nenhum atendimento futuro ativo na janela." /> : null}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function AppointmentCard({
  appointment,
  saving,
  onPatch,
}: {
  appointment: BarberAppointment;
  saving: boolean;
  onPatch: (id: string, body: { status?: "confirmed" | "completed" | "no_show"; internal_notes?: string }) => Promise<void>;
}) {
  const [note, setNote] = useState(appointment.internal_notes ?? "");
  const closed = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <article className="rounded-2xl border border-line bg-background/45 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-brass">{formatRange(appointment.starts_at, appointment.ends_at)}</p>
              <h3 className="mt-2 text-xl font-semibold">{appointment.customer_name}</h3>
              <p className="mt-1 text-sm text-muted">{serviceName(appointment)} · {duration(appointment)} min</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <p>Telefone: <span className="text-foreground">{appointment.customer_phone}</span></p>
            <p>Email: <span className="text-foreground">{appointment.customer_email ?? "-"}</span></p>
          </div>

          {appointment.notes ? (
            <p className="mt-4 rounded-2xl border border-line bg-smoke/70 p-3 text-sm text-muted">
              Cliente: {appointment.notes}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Nota interna do atendimento"
            className="field min-h-24 w-full resize-none py-3 text-sm"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => onPatch(appointment.id, { internal_notes: note })}
            className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55"
          >
            Salvar nota
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "completed" })}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brass px-4 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-45"
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              Concluir
            </button>
            <button
              type="button"
              disabled={saving || closed}
              onClick={() => onPatch(appointment.id, { status: "no_show" })}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-300/30 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-45"
            >
              <XCircle size={15} aria-hidden="true" />
              No-show
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-line px-5 py-4 last:border-r-0">
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
    <div className="rounded-2xl border border-dashed border-line bg-background/35 p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
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
      {status.replace("_", "-")}
    </span>
  );
}

function serviceName(appointment: BarberAppointment) {
  return appointment.services?.name ?? "Servico";
}

function duration(appointment: BarberAppointment) {
  return appointment.services?.duration_minutes ?? 0;
}

function uniqueCustomers(appointments: BarberAppointment[]) {
  return new Set(appointments.map((item) => item.customer_phone)).size;
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

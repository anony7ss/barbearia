import { CalendarDays, Clock3, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { cn, formatCurrency } from "@/lib/utils";

type Barber = {
  id: string;
  name: string;
};

type Appointment = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  services?: { name: string; price_cents: number; duration_minutes?: number } | null;
  barbers?: { name: string } | null;
};

export function AgendaBoard({
  appointments,
  barbers,
}: {
  appointments: Appointment[];
  barbers: Barber[];
}) {
  const todayKey = getDateKey(new Date());
  const todayAppointments = appointments.filter((appointment) => getDateKey(new Date(appointment.starts_at)) === todayKey);
  const nextAppointments = appointments
    .filter((appointment) => new Date(appointment.starts_at).getTime() >= Date.now())
    .slice(0, 6);
  const weekDays = getWeekDays();

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <BoardStat
          icon={<CalendarDays size={18} aria-hidden="true" />}
          label="Hoje"
          value={`${todayAppointments.length} horarios`}
          detail="Por barbeiro e status"
        />
        <BoardStat
          icon={<Clock3 size={18} aria-hidden="true" />}
          label="Proximo atendimento"
          value={nextAppointments[0] ? formatHour(nextAppointments[0].starts_at) : "Livre"}
          detail={nextAppointments[0]?.customer_name ?? "Sem fila imediata"}
        />
        <BoardStat
          icon={<Scissors size={18} aria-hidden="true" />}
          label="Receita prevista"
          value={formatCurrency(sumRevenue(todayAppointments))}
          detail="Confirmados e pendentes de hoje"
        />
      </div>

      <section className="rounded-[1.5rem] border border-line bg-smoke p-4">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Visao diaria</p>
            <h2 className="mt-2 text-2xl font-semibold">Agenda de hoje por cadeira</h2>
          </div>
          <p className="text-sm text-muted">{formatLongDate(new Date())}</p>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          {barbers.map((barber) => {
            const barberAppointments = todayAppointments.filter((appointment) => appointment.barber_id === barber.id);
            return (
              <div key={barber.id} className="rounded-3xl border border-line bg-background/50 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <p className="font-semibold">{barber.name}</p>
                    <p className="text-xs text-muted">{barberAppointments.length} atendimentos</p>
                  </div>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                    {getOccupancyLabel(barberAppointments.length)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {barberAppointments.length ? (
                    barberAppointments.map((appointment) => (
                      <AppointmentPill key={appointment.id} appointment={appointment} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                      Nenhum horario para hoje.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-line bg-smoke p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Visao semanal</p>
          <h2 className="mt-2 text-2xl font-semibold">Mapa rapido da semana</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayAppointments = appointments.filter((appointment) => getDateKey(new Date(appointment.starts_at)) === day.key);
            return (
              <div key={day.key} className="min-h-40 rounded-3xl border border-line bg-background/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{day.weekday}</p>
                <p className="mt-1 text-xl font-semibold">{day.day}</p>
                <div className="mt-4 grid gap-2">
                  {dayAppointments.slice(0, 4).map((appointment) => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-xs",
                        statusClass(appointment.status),
                      )}
                    >
                      {formatHour(appointment.starts_at)} · {appointment.barbers?.name?.split(" ")[0] ?? "Barbeiro"}
                    </div>
                  ))}
                  {dayAppointments.length > 4 ? (
                    <p className="text-xs text-muted">+{dayAppointments.length - 4} horarios</p>
                  ) : null}
                  {!dayAppointments.length ? <p className="text-xs text-muted">Livre</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BoardStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <div className="flex items-center gap-2 text-brass">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </div>
  );
}

function AppointmentPill({ appointment }: { appointment: Appointment }) {
  return (
    <div className={cn("rounded-2xl border p-3", statusClass(appointment.status))}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{formatHour(appointment.starts_at)}</p>
          <p className="text-sm">{appointment.customer_name}</p>
        </div>
        <span className="rounded-full border border-current/20 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em]">
          {appointment.status}
        </span>
      </div>
      <p className="mt-2 text-xs opacity-75">{appointment.services?.name ?? "Servico"}</p>
    </div>
  );
}

function sumRevenue(appointments: Appointment[]) {
  return appointments.reduce((total, appointment) => {
    if (!["pending", "confirmed", "completed"].includes(appointment.status)) return total;
    return total + (appointment.services?.price_cents ?? 0);
  }, 0);
}

function getWeekDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      key: getDateKey(date),
      weekday: new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        timeZone: "America/Sao_Paulo",
      }).format(date).replace(".", ""),
      day: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(date),
    };
  });
}

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getOccupancyLabel(total: number) {
  if (total >= 8) return "alta";
  if (total >= 4) return "media";
  return "leve";
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    confirmed: "border-brass/35 bg-brass/12 text-foreground",
    pending: "border-white/20 bg-white/[0.04] text-muted",
    completed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    cancelled: "border-red-300/20 bg-red-300/10 text-red-100",
    no_show: "border-orange-300/20 bg-orange-300/10 text-orange-100",
  };

  return classes[status] ?? "border-line bg-white/[0.03] text-muted";
}

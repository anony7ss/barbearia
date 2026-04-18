import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Clock3, NotebookPen, Scissors, Star, UserRound, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/server/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  internal_notes: string | null;
  services?: { name?: string; price_cents?: number; duration_minutes?: number } | Array<{ name?: string; price_cents?: number; duration_minutes?: number }> | null;
  barbers?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
};

type LoyaltyEvent = {
  points_delta: number;
  reason: string;
  created_at: string;
};

type NoShowEvent = {
  created_at: string;
  customer_phone: string | null;
  customer_email: string | null;
};

export default async function AdminClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const parsedId = z.string().uuid().safeParse(rawId);
  if (!parsedId.success) notFound();
  const id = parsedId.data;
  const { supabase } = await requireAdmin();

  const [
    { data: client },
    { data: appointments },
    { data: loyaltyEvents },
    { data: noShowEvents },
    { data: barbers },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,phone,role,loyalty_points,preferred_barber_id,internal_notes,is_active,deleted_at,created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,notes,internal_notes,services(name,price_cents,duration_minutes),barbers(id,name)")
      .eq("user_id", id)
      .order("starts_at", { ascending: false })
      .limit(80),
    supabase
      .from("loyalty_events")
      .select("points_delta,reason,created_at")
      .eq("profile_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("no_show_events")
      .select("created_at,customer_phone,customer_email")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("barbers").select("id,name").eq("is_active", true),
  ]);

  if (!client) {
    notFound();
  }

  const list = (appointments ?? []) as AppointmentRow[];
  const nowTime = new Date().getTime();
  const upcoming = list.filter((appointment) => new Date(appointment.starts_at).getTime() >= nowTime && ["pending", "confirmed"].includes(appointment.status));
  const history = list.filter((appointment) => new Date(appointment.starts_at).getTime() < nowTime || ["completed", "cancelled", "no_show"].includes(appointment.status));
  const completed = list.filter((appointment) => appointment.status === "completed");
  const ticketEstimated = completed.length ? sumRevenue(completed) / completed.length : 0;
  const favoriteBarber = resolveFavoriteBarber(client.preferred_barber_id, barbers ?? [], list);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link href="/admin/clientes" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground">
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar para clientes
        </Link>
        <div className="mt-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Perfil operacional</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {client.full_name ?? "Cliente sem nome"}.
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              Historico completo, preferencias, no-shows, notas internas e metricas de atendimento.
            </p>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-smoke">
            <div className="border-r border-line px-5 py-4">
              <p className="text-2xl font-semibold">{client.role}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Role</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-2xl font-semibold">{client.is_active ? "Ativo" : "Inativo"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Status</p>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<CalendarDays size={17} />} label="Proximos horarios" value={upcoming.length} detail="ativos no futuro" tone="gold" />
        <Metric icon={<XCircle size={17} />} label="No-shows" value={noShowEvents?.length ?? 0} detail="eventos registrados" />
        <Metric icon={<Star size={17} />} label="Pontos" value={client.loyalty_points} detail="saldo de fidelidade" />
        <Metric icon={<Scissors size={17} />} label="Ticket estimado" value={formatCurrency(Math.round(ticketEstimated))} detail="media concluida" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="grid gap-4">
          <Panel title="Dados e preferencias" icon={<UserRound size={17} />}>
            <Info label="Telefone" value={client.phone || "-"} />
            <Info label="Barbeiro favorito" value={favoriteBarber} />
            <Info label="Criado em" value={formatDateTime(client.created_at)} />
            <Info label="ID" value={client.id.slice(0, 8)} mono />
          </Panel>

          <Panel title="Notas internas" icon={<NotebookPen size={17} />}>
            <p className="text-sm leading-6 text-muted">
              {client.internal_notes || "Nenhuma nota interna cadastrada para este cliente."}
            </p>
          </Panel>

          <Panel title="Acoes rapidas" icon={<Clock3 size={17} />}>
            <div className="grid gap-2">
              <Link href={`/admin/agenda?cliente=${client.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground">Criar ou localizar agendamento</Link>
              <Link href="/admin/clientes" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground">Editar dados e permissao</Link>
              <a href={`https://wa.me/55${client.phone ?? ""}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground" target="_blank" rel="noreferrer">Abrir WhatsApp</a>
            </div>
          </Panel>
        </aside>

        <div className="grid gap-5">
          <Panel title="Proximos agendamentos" icon={<CalendarDays size={17} />}>
            <AppointmentList appointments={upcoming.slice(0, 8)} empty="Nenhum horario futuro ativo." />
          </Panel>

          <Panel title="Historico completo" icon={<Clock3 size={17} />}>
            <AppointmentList appointments={history.slice(0, 20)} empty="Sem historico carregado." />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Eventos de fidelidade" icon={<Star size={17} />}>
              <SimpleList
                items={(loyaltyEvents ?? []) as LoyaltyEvent[]}
                empty="Sem eventos de pontos."
                render={(event) => (
                  <>
                    <span>{event.points_delta > 0 ? "+" : ""}{event.points_delta} pontos · {event.reason}</span>
                    <span>{formatDateTime(event.created_at)}</span>
                  </>
                )}
              />
            </Panel>
            <Panel title="No-shows" icon={<XCircle size={17} />}>
              <SimpleList
                items={(noShowEvents ?? []) as NoShowEvent[]}
                empty="Sem no-show registrado."
                render={(event) => (
                  <>
                    <span>{event.customer_phone || event.customer_email || "Contato protegido"}</span>
                    <span>{formatDateTime(event.created_at)}</span>
                  </>
                )}
              />
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <div className="mb-4 flex items-center gap-2 text-brass">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({
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
    <div className={`rounded-[1.5rem] border border-line p-5 ${tone === "gold" ? "bg-brass text-ink" : "bg-smoke"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className={`mt-1 text-sm ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{detail}</p>
    </div>
  );
}

function AppointmentList({ appointments, empty }: { appointments: AppointmentRow[]; empty: string }) {
  if (!appointments.length) {
    return <p className="rounded-2xl border border-dashed border-line bg-background/35 p-4 text-sm text-muted">{empty}</p>;
  }

  return (
    <div className="grid gap-3">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="rounded-2xl border border-line bg-background/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{serviceName(appointment)}</p>
              <p className="mt-1 text-sm text-muted">{barberName(appointment)} · {formatDateTime(appointment.starts_at)}</p>
            </div>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {appointment.status.replace("_", "-")}
            </span>
          </div>
          {appointment.internal_notes ? (
            <p className="mt-3 text-sm text-muted">Nota interna: {appointment.internal_notes}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SimpleList<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => ReactNode }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;

  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background/45 px-4 py-3 text-sm">
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}

function serviceName(appointment: AppointmentRow) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.name ?? "Servico";
}

function barberName(appointment: AppointmentRow) {
  const barber = Array.isArray(appointment.barbers) ? appointment.barbers[0] : appointment.barbers;
  return barber?.name ?? "Barbeiro";
}

function servicePrice(appointment: AppointmentRow) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.price_cents ?? 0;
}

function sumRevenue(appointments: AppointmentRow[]) {
  return appointments.reduce((total, appointment) => total + servicePrice(appointment), 0);
}

function resolveFavoriteBarber(
  preferredBarberId: string | null,
  barbers: Array<{ id: string; name: string }>,
  appointments: AppointmentRow[],
) {
  if (preferredBarberId) {
    return barbers.find((barber) => barber.id === preferredBarberId)?.name ?? "Barbeiro removido";
  }

  const counts = new Map<string, { name: string; count: number }>();
  for (const appointment of appointments) {
    const barber = Array.isArray(appointment.barbers) ? appointment.barbers[0] : appointment.barbers;
    if (!barber?.id || !barber.name) continue;
    const current = counts.get(barber.id) ?? { name: barber.name, count: 0 };
    counts.set(barber.id, { ...current, count: current.count + 1 });
  }

  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.name ?? "Sem preferencia";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

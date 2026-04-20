import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, CalendarDays, Clock3, FileText, Mail, Scissors, UsersRound } from "lucide-react";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { requireAdmin } from "@/lib/server/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    { data: todayAppointments },
    { data: weekAppointments },
    { count: clients },
    { count: barbers },
    { count: services },
    { count: failedJobs },
    { count: newContactMessages },
    { count: totalContactMessages },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*,services(name,price_cents,duration_minutes),barbers(name)")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("*,services(name,price_cents,duration_minutes),barbers(name)")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at")
      .limit(120),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").eq("is_active", true).is("deleted_at", null),
    supabase.from("barbers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("notification_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase
      .from("business_settings")
      .select("notification_cron_last_run_at")
      .eq("id", true)
      .maybeSingle(),
  ]);

  const today = (todayAppointments ?? []) as AppointmentForMetric[];
  const week = (weekAppointments ?? []) as AppointmentForMetric[];
  const revenue = sumRevenue(today);
  const confirmed = today.filter((appointment) => ["pending", "confirmed"].includes(appointment.status)).length;
  const cancelled = week.filter((appointment) => appointment.status === "cancelled").length;
  const noShow = week.filter((appointment) => appointment.status === "no_show").length;
  const staleCron = isCronStale(settings?.notification_cron_last_run_at ?? null);
  const occupancy = barbers ? Math.min(100, Math.round((confirmed / Math.max(barbers * 10, 1)) * 100)) : 0;
  const nextAppointment = week.find((appointment) => new Date(appointment.starts_at).getTime() >= now.getTime());

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Operacao em tempo real.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Acompanhe agenda, receita estimada, ocupacao e pontos que exigem atencao.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminAction href="/admin/agenda">Abrir agenda</AdminAction>
          <AdminAction href="/admin/barbeiros">Gerenciar equipe</AdminAction>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarDays size={18} />} label="Agendamentos hoje" value={today.length} detail={`${confirmed} ativos`} tone="gold" />
        <MetricCard icon={<Clock3 size={18} />} label="Ocupacao" value={`${occupancy}%`} detail="estimativa diaria" />
        <MetricCard icon={<Scissors size={18} />} label="Receita prevista" value={formatCurrency(revenue)} detail="hoje" tone="green" />
        <MetricCard icon={<UsersRound size={18} />} label="Base ativa" value={clients ?? 0} detail={`${barbers ?? 0} barbeiros · ${services ?? 0} servicos`} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Proximos atendimentos</h2>
              <p className="mt-1 text-sm text-muted">Status editavel diretamente na tabela.</p>
            </div>
            <Link href="/admin/agenda" className="text-sm font-semibold text-brass hover:text-foreground">
              Ver semana
            </Link>
          </div>
          <AppointmentsTable appointments={(todayAppointments ?? []) as never} compact />
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Agora</p>
            <h2 className="mt-3 text-2xl font-semibold">Proximo horario</h2>
            {nextAppointment ? (
              <div className="mt-4 rounded-2xl border border-line bg-background/55 p-4">
                <p className="font-semibold">{formatHour(nextAppointment.starts_at)} · {nextAppointment.customer_name}</p>
                <p className="mt-2 text-sm text-muted">
                  {getServiceName(nextAppointment)} com {getBarberName(nextAppointment)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">Nenhum atendimento futuro na janela carregada.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Alertas</p>
            <div className="mt-4 grid gap-3">
              <Insight label="Cancelamentos na semana" value={cancelled} />
              <Insight label="No-show na semana" value={noShow} />
              <Insight label="Falhas de email" value={failedJobs ?? 0} />
              <Insight label="Cron notificacoes" value={staleCron ? "Atrasado" : "OK"} />
              <Insight label="Agenda carregada" value={week.length} />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminModuleCard
          href="/admin/relatorios"
          eyebrow="Relatorios"
          title="Analise operacional completa."
          description="Filtre por datas, barbeiro, servico, status e origem para comparar volume, ticket medio, receita e cancelamentos."
          metricLabel="Janela ativa"
          metricValue={`${week.length} agendamentos na semana`}
          icon={<FileText size={18} aria-hidden="true" />}
        />
        <AdminModuleCard
          href="/admin/contato"
          eyebrow="Contato"
          title="Mensagens e retorno rapido."
          description="Leia tudo que entrou pelo site, responda por email ou WhatsApp e organize a caixa operacional sem sair do admin."
          metricLabel="Caixa atual"
          metricValue={`${newContactMessages ?? 0} novas · ${totalContactMessages ?? 0} totais`}
          icon={<Mail size={18} aria-hidden="true" />}
        />
      </section>
    </main>
  );
}

type AppointmentForMetric = {
  starts_at: string;
  status: string;
  customer_name: string;
  services?: { name?: string; price_cents?: number } | Array<{ name?: string; price_cents?: number }> | null;
  barbers?: { name?: string } | Array<{ name?: string }> | null;
};

function AdminAction({ href, children }: { href: string; children: ReactNode }) {
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

function AdminModuleCard({
  href,
  eyebrow,
  title,
  description,
  metricLabel,
  metricValue,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.5rem] border border-line bg-smoke p-5 transition hover:border-brass/45 hover:bg-[#201b16]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-background/45 text-brass transition group-hover:border-brass/45">
          {icon}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl border border-line bg-background/35 px-4 py-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">{metricLabel}</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{metricValue}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-brass transition group-hover:text-foreground">
          Abrir
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function sumRevenue(appointments: AppointmentForMetric[]) {
  return appointments.reduce((total, appointment) => {
    if (!["pending", "confirmed", "completed"].includes(appointment.status)) return total;
    const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
    return total + (service?.price_cents ?? 0);
  }, 0);
}

function getServiceName(appointment: AppointmentForMetric) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.name ?? "Servico";
}

function getBarberName(appointment: AppointmentForMetric) {
  const barber = Array.isArray(appointment.barbers) ? appointment.barbers[0] : appointment.barbers;
  return barber?.name ?? "Barbeiro";
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function isCronStale(value: string | null) {
  if (!value) return true;
  return Date.now() - new Date(value).getTime() > 60 * 60 * 1000;
}

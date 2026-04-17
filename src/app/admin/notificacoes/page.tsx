import { Bell, Clock3, MailWarning } from "lucide-react";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: jobs }, { data: settings }] = await Promise.all([
    supabase
      .from("notification_jobs")
      .select("id,appointment_id,channel,template,scheduled_for,status,attempts,last_error,created_at,updated_at,appointments(customer_name,starts_at,services(name))")
      .order("scheduled_for", { ascending: false })
      .limit(150),
    supabase
      .from("business_settings")
      .select("notification_cron_last_run_at,notification_cron_last_result")
      .eq("id", true)
      .maybeSingle(),
  ]);
  const loadedJobs = (jobs ?? []) as unknown as NotificationJob[];
  const failed = loadedJobs.filter((job) => job.status === "failed").length;
  const queued = loadedJobs.filter((job) => job.status === "queued").length;
  const sent = loadedJobs.filter((job) => job.status === "sent").length;
  const staleCron = isCronStale(settings?.notification_cron_last_run_at ?? null);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Notificacoes</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Emails e cron.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Acompanhe lembretes, confirmacoes, cancelamentos, reagendamentos e pedidos de avaliacao.
          </p>
        </div>
      </div>

      {staleCron ? (
        <div className="mb-5 rounded-[1.25rem] border border-red-300/25 bg-red-300/10 p-4 text-sm text-red-100">
          O processador de notificacoes nao roda ha mais de 1 hora. Verifique o Cron da Vercel e `CRON_SECRET`.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Stat icon={<Bell size={17} />} label="Na fila" value={queued} />
        <Stat icon={<Clock3 size={17} />} label="Enviados" value={sent} />
        <Stat icon={<MailWarning size={17} />} label="Falhas" value={failed} tone="danger" />
        <Stat
          icon={<Clock3 size={17} />}
          label="Ultimo cron"
          value={settings?.notification_cron_last_run_at ? formatRelative(settings.notification_cron_last_run_at) : "Nunca"}
        />
      </section>

      <section className="mt-6 overflow-x-auto rounded-[1.5rem] border border-line bg-smoke">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Agendado para</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Tentativas</th>
              <th className="px-4 py-3 font-semibold">Erro seguro</th>
            </tr>
          </thead>
          <tbody>
            {loadedJobs.map((job) => (
              <tr key={job.id} className="border-t border-line">
                <td className="px-4 py-4">
                  <p className="font-semibold">{templateLabel(job.template)}</p>
                  <p className="mt-1 font-mono text-[0.68rem] text-muted">{job.id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{job.appointments?.customer_name ?? "-"}</p>
                  <p className="mt-1 text-xs text-muted">{job.appointments?.services?.name ?? ""}</p>
                </td>
                <td className="px-4 py-4">{formatDate(job.scheduled_for)}</td>
                <td className="px-4 py-4"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-4">{job.attempts}</td>
                <td className="max-w-xs px-4 py-4 text-muted">{job.last_error ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

type NotificationJob = {
  id: string;
  template: string;
  scheduled_for: string;
  status: string;
  attempts: number;
  last_error: string | null;
  appointments?: {
    customer_name: string;
    services?: { name: string } | null;
  } | null;
};

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone?: "danger" }) {
  return (
    <div className={`rounded-[1.5rem] border p-5 ${tone === "danger" ? "border-red-300/20 bg-red-300/10" : "border-line bg-smoke"}`}>
      <div className="flex items-center gap-2 text-brass">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    queued: "border-brass/25 bg-brass/10 text-brass",
    sent: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    failed: "border-red-300/25 bg-red-300/10 text-red-100",
    cancelled: "border-line bg-background/45 text-muted",
  };
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${classes[status] ?? classes.cancelled}`}>
      {status}
    </span>
  );
}

function templateLabel(template: string) {
  const labels: Record<string, string> = {
    booking_confirmation: "Confirmacao",
    appointment_reminder_24h: "Lembrete 24h",
    appointment_reminder_2h: "Lembrete 2h",
    appointment_review_request: "Pedido de avaliacao",
    appointment_cancelled: "Cancelamento",
    appointment_rescheduled: "Reagendamento",
  };
  return labels[template] ?? template;
}

function isCronStale(value: string | null) {
  if (!value) return true;
  return Date.now() - new Date(value).getTime() > 60 * 60 * 1000;
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)}h`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

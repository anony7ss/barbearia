import { Bell, Clock3, MailWarning, Search } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPaginationLinks } from "@/components/admin/pagination-links";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type NotificationsSearchParams = Promise<{
  jobsPage?: string | string[];
  q?: string | string[];
  status?: string | string[];
  template?: string | string[];
}>;

const jobsPageSize = 15;
const templateOptions = [
  "booking_confirmation",
  "appointment_reminder_24h",
  "appointment_reminder_2h",
  "appointment_review_request",
  "appointment_cancelled",
  "appointment_rescheduled",
] as const;
const statusOptions = ["queued", "failed", "sent", "cancelled"] as const;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: NotificationsSearchParams;
}) {
  const query = await searchParams;
  const searchTerm = normalizeSearchParam(query.q);
  const statusFilter = normalizeSearchParam(query.status);
  const templateFilter = normalizeSearchParam(query.template);
  const { supabase } = await requireAdmin();
  const [{ data: jobs }, { data: settings }] = await Promise.all([
    supabase
      .from("notification_jobs")
      .select("id,appointment_id,channel,template,scheduled_for,status,attempts,last_error,created_at,updated_at,appointments(customer_name,starts_at,services(name))")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("business_settings")
      .select("notification_cron_last_run_at,notification_cron_last_result")
      .eq("id", true)
      .maybeSingle(),
  ]);
  const loadedJobs = sortNotificationJobs((jobs ?? []) as unknown as NotificationJob[]);
  const failed = loadedJobs.filter((job) => job.status === "failed").length;
  const queued = loadedJobs.filter((job) => job.status === "queued").length;
  const sent = loadedJobs.filter((job) => job.status === "sent").length;
  const cancelled = loadedJobs.filter((job) => job.status === "cancelled").length;
  const filteredJobs = loadedJobs.filter((job) => matchesNotificationFilters(job, searchTerm, statusFilter, templateFilter));
  const staleCron = isCronStale(settings?.notification_cron_last_run_at ?? null);
  const jobsTotalPages = getPageCount(filteredJobs.length, jobsPageSize);
  const jobsCurrentPage = clampPage(parsePageParam(query.jobsPage), jobsTotalPages);
  const paginatedJobs = paginate(filteredJobs, jobsCurrentPage, jobsPageSize);

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

      <section className="mt-6 grid gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full border border-brass/20 bg-brass/8 px-3 py-1 font-semibold uppercase tracking-[0.14em] text-brass">
            Ativos primeiro
          </span>
          <span>Fila e falhas aparecem antes do historico concluido.</span>
          <span className="rounded-full border border-line bg-background/45 px-3 py-1">
            cancelados: {cancelled}
          </span>
        </div>
        <form className="grid gap-3 rounded-[1.5rem] border border-line bg-smoke p-4 lg:grid-cols-[minmax(0,1.4fr)_220px_260px_auto] lg:items-center">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={searchTerm}
              placeholder="Buscar por cliente, servico, template ou id"
              className="field w-full pl-11"
            />
          </label>
          <select name="status" defaultValue={statusFilter || "all"} className="field w-full">
            <option value="all">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <select name="template" defaultValue={templateFilter || "all"} className="field w-full">
            <option value="all">Todos os templates</option>
            {templateOptions.map((template) => (
              <option key={template} value={template}>
                {templateLabel(template)}
              </option>
            ))}
          </select>
          <div className="flex gap-2 lg:justify-end">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-5 text-sm font-semibold text-ink transition hover:brightness-105">
              Filtrar
            </button>
            <a
              href="/admin/notificacoes"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              Limpar
            </a>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>
            {filteredJobs.length} de {loadedJobs.length} jobs visiveis
          </p>
          {(searchTerm || statusFilter || templateFilter) ? (
            <p className="text-xs uppercase tracking-[0.14em] text-brass">Filtro ativo</p>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-smoke">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Janela</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tentativas</th>
                <th className="px-4 py-3 font-semibold">Ultima atividade</th>
                <th className="px-4 py-3 font-semibold">Erro seguro</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => (
                <tr key={job.id} className="border-t border-line">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{templateLabel(job.template)}</p>
                    <p className="mt-1 font-mono text-[0.68rem] text-muted">{job.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{job.appointments?.customer_name ?? "-"}</p>
                    <p className="mt-1 text-xs text-muted">{job.appointments?.services?.name ?? ""}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{formatDate(job.scheduled_for)}</p>
                    <p className="mt-1 text-xs text-muted">
                      criado {formatRelative(job.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-4">{job.attempts}</td>
                  <td className="px-4 py-4">
                    <p>{formatDate(job.updated_at)}</p>
                    <p className="mt-1 text-xs text-muted">{formatRelative(job.updated_at)}</p>
                  </td>
                  <td className="max-w-xs px-4 py-4 text-muted">{job.last_error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredJobs.length ? (
          <AdminPaginationLinks
            currentPage={jobsCurrentPage}
            totalPages={jobsTotalPages}
            label="jobs de notificacao"
            hrefForPage={(page) => buildNotificationsHref({ page, q: searchTerm, status: statusFilter, template: templateFilter })}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-smoke p-4 text-sm text-muted">Nenhum job de notificacao encontrado.</p>
        )}
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
  created_at: string;
  updated_at: string;
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
  const labels: Record<string, string> = {
    queued: "Na fila",
    sent: "Enviado",
    failed: "Falhou",
    cancelled: "Cancelado",
  };
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${classes[status] ?? classes.cancelled}`}>
      {labels[status] ?? status}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "Na fila",
    sent: "Enviado",
    failed: "Falhou",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
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

function sortNotificationJobs(items: NotificationJob[]) {
  const statusPriority: Record<string, number> = {
    failed: 0,
    queued: 1,
    sent: 2,
    cancelled: 3,
  };

  return [...items].sort((left, right) => {
    const leftPriority = statusPriority[left.status] ?? 99;
    const rightPriority = statusPriority[right.status] ?? 99;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

function matchesNotificationFilters(
  job: NotificationJob,
  searchTerm: string,
  statusFilter: string,
  templateFilter: string,
) {
  if (statusFilter && statusFilter !== "all" && job.status !== statusFilter) {
    return false;
  }

  if (templateFilter && templateFilter !== "all" && job.template !== templateFilter) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  const haystack = [
    job.id,
    job.status,
    job.template,
    templateLabel(job.template),
    job.appointments?.customer_name ?? "",
    job.appointments?.services?.name ?? "",
    job.last_error ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm.toLowerCase());
}

function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? 1);
  return Number.isFinite(page) ? Math.trunc(page) : 1;
}

function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
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

function normalizeSearchParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function buildNotificationsHref(input: {
  page: number;
  q?: string;
  status?: string;
  template?: string;
}) {
  const params = new URLSearchParams();
  if (input.page > 1) params.set("jobsPage", String(input.page));
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.template && input.template !== "all") params.set("template", input.template);
  const query = params.toString();
  return `/admin/notificacoes${query ? `?${query}` : ""}`;
}

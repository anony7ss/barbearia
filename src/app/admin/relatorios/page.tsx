import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarRange, FileText, Scissors, UserRound, UsersRound } from "lucide-react";
import { AdminPaginationLinks } from "@/components/admin/pagination-links";
import { requireAdmin } from "@/lib/server/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportsSearchParams = Promise<{
  from?: string | string[];
  to?: string | string[];
  barber?: string | string[];
  service?: string | string[];
  status?: string | string[];
  source?: string | string[];
  page?: string | string[];
}>;

type ReportAppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  services?: { id?: string; name?: string; price_cents?: number } | Array<{ id?: string; name?: string; price_cents?: number }> | null;
  barbers?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
};

type Filters = {
  from: string;
  to: string;
  barber: string;
  service: string;
  status: string;
  source: string;
};

const reportPageSize = 12;
const defaultLookbackDays = 30;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: ReportsSearchParams;
}) {
  const query = await searchParams;
  const filters = resolveFilters(query);
  const { supabase } = await requireAdmin();

  const [barbersResult, servicesResult, appointmentsResult] = await Promise.all([
    supabase.from("barbers").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("services").select("id,name").eq("is_active", true).order("display_order"),
    buildAppointmentsQuery(supabase, filters),
  ]);

  if (barbersResult.error) throw barbersResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  const appointments = (appointmentsResult.data ?? []) as ReportAppointmentRow[];
  const totalPages = getPageCount(appointments.length, reportPageSize);
  const currentPage = clampPage(parsePageParam(query.page), totalPages);
  const paginatedAppointments = paginate(appointments, currentPage, reportPageSize);

  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed");
  const activeAppointments = appointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status));
  const cancelledAppointments = appointments.filter((appointment) => appointment.status === "cancelled");
  const noShowAppointments = appointments.filter((appointment) => appointment.status === "no_show");
  const estimatedRevenue = sumRevenue(appointments.filter((appointment) => ["pending", "confirmed", "completed"].includes(appointment.status)));
  const closedRevenue = sumRevenue(completedAppointments);
  const averageTicket = completedAppointments.length ? closedRevenue / completedAppointments.length : 0;
  const uniqueClients = countUniqueClients(appointments);
  const dailySummary = buildDailySummary(appointments);
  const topServices = buildServiceRanking(appointments);
  const topBarbers = buildBarberRanking(appointments);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Relatorios</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Periodo, equipe e desempenho.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Filtre por datas, barbeiro, servico, status e origem para entender operacao, recorrencia e receita.
          </p>
        </div>
      </div>

      <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Filtros</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ajuste o recorte para comparar periodos, barbeiros, servicos e origem dos agendamentos.
            </p>
          </div>
          <Link
            href="/admin/relatorios"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
          >
            Limpar filtros
          </Link>
        </div>

        <form className="mt-5 grid gap-3 xl:grid-cols-6">
          <FilterField label="De">
            <input type="date" name="from" defaultValue={filters.from} className="field w-full" />
          </FilterField>
          <FilterField label="Ate">
            <input type="date" name="to" defaultValue={filters.to} className="field w-full" />
          </FilterField>
          <FilterField label="Barbeiro">
            <select name="barber" defaultValue={filters.barber} className="field w-full">
              <option value="">Todos</option>
              {(barbersResult.data ?? []).map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Servico">
            <select name="service" defaultValue={filters.service} className="field w-full">
              <option value="">Todos</option>
              {(servicesResult.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={filters.status} className="field w-full">
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Concluido</option>
              <option value="cancelled">Cancelado</option>
              <option value="no_show">No-show</option>
            </select>
          </FilterField>
          <FilterField label="Origem">
            <select name="source" defaultValue={filters.source} className="field w-full">
              <option value="">Todas</option>
              <option value="guest">Sem conta</option>
              <option value="account">Com conta</option>
              <option value="admin">Manual admin</option>
            </select>
          </FilterField>
          <div className="xl:col-span-6 flex flex-wrap gap-2">
            <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a]">
              Aplicar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarRange size={17} />} label="Agendamentos" value={appointments.length} detail="no recorte atual" />
        <MetricCard icon={<Scissors size={17} />} label="Receita fechada" value={formatCurrency(closedRevenue)} detail={`${completedAppointments.length} concluidos`} tone="gold" />
        <MetricCard icon={<FileText size={17} />} label="Receita prevista" value={formatCurrency(estimatedRevenue)} detail={`${activeAppointments.length} ativos`} />
        <MetricCard icon={<UsersRound size={17} />} label="Clientes unicos" value={uniqueClients} detail={`${cancelledAppointments.length} cancelados · ${noShowAppointments.length} no-show`} />
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<UserRound size={17} />} label="Ticket medio" value={formatCurrency(Math.round(averageTicket))} detail="sobre concluidos" />
        <MetricCard icon={<CalendarRange size={17} />} label="Pendentes" value={appointments.filter((item) => item.status === "pending").length} detail="aguardando confirmacao" />
        <MetricCard icon={<CalendarRange size={17} />} label="Confirmados" value={appointments.filter((item) => item.status === "confirmed").length} detail="horarios reservados" />
        <MetricCard icon={<CalendarRange size={17} />} label="Origem dominante" value={topSourceLabel(appointments)} detail="canal mais usado" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Resumo por dia</h2>
            <p className="mt-1 text-sm text-muted">Volume, concluidos e receita por data dentro do recorte.</p>
          </div>

          {dailySummary.length ? (
            <div className="grid gap-3">
              {dailySummary.map((day) => (
                <div key={day.key} className="grid gap-3 rounded-2xl border border-line bg-background/45 p-4 sm:grid-cols-4">
                  <MiniMetric label="Dia" value={day.label} />
                  <MiniMetric label="Agenda" value={day.total} />
                  <MiniMetric label="Concluidos" value={day.completed} />
                  <MiniMetric label="Receita" value={formatCurrency(day.revenue)} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel>Nenhum atendimento no periodo escolhido.</EmptyPanel>
          )}
        </div>

        <div className="grid gap-6">
          <RankingPanel title="Servicos mais puxados" items={topServices} empty="Sem servicos no recorte." />
          <RankingPanel title="Barbeiros mais acionados" items={topBarbers} empty="Sem barbeiros no recorte." />
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-line bg-smoke p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Leitura detalhada</h2>
            <p className="mt-1 text-sm text-muted">Tabela operacional com os atendimentos carregados para o recorte atual.</p>
          </div>
          <div className="text-sm text-muted">
            <p>{appointments.length} registros carregados</p>
            <p className="mt-1">Pagina {currentPage} de {totalPages}</p>
          </div>
        </div>

        {appointments.length ? (
          <div className="grid gap-3">
            <div className="overflow-x-auto rounded-[1.25rem] border border-line bg-background/35">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Servico</th>
                    <th className="px-4 py-3 font-semibold">Barbeiro</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Origem</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-line">
                      <td className="px-4 py-4">
                        <p className="font-mono text-xs">{formatDateTime(appointment.starts_at)}</p>
                        <p className="mt-1 font-mono text-[0.68rem] text-muted">{formatHour(appointment.ends_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{appointment.customer_name}</p>
                        <p className="mt-1 text-xs text-muted">{appointment.customer_phone}</p>
                      </td>
                      <td className="px-4 py-4">{serviceName(appointment)}</td>
                      <td className="px-4 py-4">{barberName(appointment)}</td>
                      <td className="px-4 py-4">
                        <StatusPill status={appointment.status} />
                      </td>
                      <td className="px-4 py-4">{sourceLabel(appointment.source)}</td>
                      <td className="px-4 py-4 text-right font-semibold">{formatCurrency(servicePrice(appointment))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPaginationLinks
              currentPage={currentPage}
              totalPages={totalPages}
              label="relatorio detalhado"
              hrefForPage={(page) => reportHref(filters, page)}
            />
          </div>
        ) : (
          <EmptyPanel>Nenhum agendamento encontrado para os filtros informados.</EmptyPanel>
        )}
      </section>
    </main>
  );
}

async function buildAppointmentsQuery(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  filters: Filters,
) {
  let query = supabase
    .from("appointments")
    .select("id,starts_at,ends_at,status,source,customer_name,customer_phone,customer_email,services(id,name,price_cents),barbers(id,name)")
    .gte("starts_at", `${filters.from}T00:00:00.000-03:00`)
    .lt("starts_at", `${filters.to}T23:59:59.999-03:00`)
    .order("starts_at", { ascending: false })
    .limit(1000);

  if (filters.barber) query = query.eq("barber_id", filters.barber);
  if (filters.service) query = query.eq("service_id", filters.service);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);

  return query;
}

function resolveFilters(query: Awaited<ReportsSearchParams>): Filters {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - defaultLookbackDays);

  return {
    from: normalizeDateInput(readQueryValue(query.from)) ?? toDateInput(start),
    to: normalizeDateInput(readQueryValue(query.to)) ?? toDateInput(now),
    barber: readQueryValue(query.barber) ?? "",
    service: readQueryValue(query.service) ?? "",
    status: readQueryValue(query.status) ?? "",
    source: readQueryValue(query.source) ?? "",
  };
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
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

function reportHref(filters: Filters, page: number) {
  const params = new URLSearchParams();
  params.set("from", filters.from);
  params.set("to", filters.to);
  if (filters.barber) params.set("barber", filters.barber);
  if (filters.service) params.set("service", filters.service);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (page > 1) params.set("page", String(page));
  return `/admin/relatorios?${params.toString()}`;
}

function buildDailySummary(appointments: ReportAppointmentRow[]) {
  const map = new Map<string, { key: string; label: string; total: number; completed: number; revenue: number }>();

  for (const appointment of appointments) {
    const key = toDateInput(new Date(appointment.starts_at));
    const current = map.get(key) ?? {
      key,
      label: formatDayLabel(appointment.starts_at),
      total: 0,
      completed: 0,
      revenue: 0,
    };

    current.total += 1;
    if (appointment.status === "completed") {
      current.completed += 1;
      current.revenue += servicePrice(appointment);
    }

    map.set(key, current);
  }

  return [...map.values()].sort((left, right) => right.key.localeCompare(left.key)).slice(0, 10);
}

function buildServiceRanking(appointments: ReportAppointmentRow[]) {
  const map = new Map<string, { label: string; count: number; revenue: number }>();

  for (const appointment of appointments) {
    const label = serviceName(appointment);
    const current = map.get(label) ?? { label, count: 0, revenue: 0 };
    current.count += 1;
    if (appointment.status === "completed") {
      current.revenue += servicePrice(appointment);
    }
    map.set(label, current);
  }

  return [...map.values()].sort((left, right) => right.count - left.count || right.revenue - left.revenue).slice(0, 6);
}

function buildBarberRanking(appointments: ReportAppointmentRow[]) {
  const map = new Map<string, { label: string; count: number; revenue: number }>();

  for (const appointment of appointments) {
    const label = barberName(appointment);
    const current = map.get(label) ?? { label, count: 0, revenue: 0 };
    current.count += 1;
    if (appointment.status === "completed") {
      current.revenue += servicePrice(appointment);
    }
    map.set(label, current);
  }

  return [...map.values()].sort((left, right) => right.count - left.count || right.revenue - left.revenue).slice(0, 6);
}

function countUniqueClients(appointments: ReportAppointmentRow[]) {
  return new Set(
    appointments.map((appointment) => {
      return appointment.customer_email?.trim().toLowerCase() || appointment.customer_phone.replace(/\D/g, "");
    }),
  ).size;
}

function topSourceLabel(appointments: ReportAppointmentRow[]) {
  const counts = new Map<string, number>();

  for (const appointment of appointments) {
    counts.set(appointment.source, (counts.get(appointment.source) ?? 0) + 1);
  }

  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return top ? sourceLabel(top) : "-";
}

function sumRevenue(appointments: ReportAppointmentRow[]) {
  return appointments.reduce((total, appointment) => total + servicePrice(appointment), 0);
}

function serviceName(appointment: ReportAppointmentRow) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.name ?? "Servico";
}

function barberName(appointment: ReportAppointmentRow) {
  const barber = Array.isArray(appointment.barbers) ? appointment.barbers[0] : appointment.barbers;
  return barber?.name ?? "Barbeiro";
}

function servicePrice(appointment: ReportAppointmentRow) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.price_cents ?? 0;
}

function sourceLabel(value: string) {
  const labels: Record<string, string> = {
    guest: "Sem conta",
    account: "Com conta",
    admin: "Manual admin",
  };

  return labels[value] ?? value;
}

function toDateInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
      {children}
    </label>
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
  tone?: "gold";
}) {
  return (
    <div className={`rounded-[1.5rem] border border-line p-5 ${tone === "gold" ? "bg-brass text-ink" : "bg-smoke"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{value}</p>
      <p className={`mt-1 text-sm ${tone === "gold" ? "text-ink/70" : "text-muted"}`}>{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-black/20 px-3 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function RankingPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ label: string; count: number; revenue: number }>;
  empty: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="grid gap-2 rounded-2xl border border-line bg-background/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.label}</p>
                <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">{item.count}x</span>
              </div>
              <p className="text-sm text-muted">Receita concluida: {formatCurrency(item.revenue)}</p>
            </div>
          ))
        ) : (
          <EmptyPanel>{empty}</EmptyPanel>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "No-show",
  };

  const classes: Record<string, string> = {
    pending: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    confirmed: "border-brass/35 bg-brass/12 text-foreground",
    completed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    cancelled: "border-red-300/25 bg-red-300/10 text-red-100",
    no_show: "border-orange-300/20 bg-orange-300/10 text-orange-100",
  };

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${classes[status] ?? "border-line bg-background/45 text-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-background/35 p-4 text-sm text-muted">
      {children}
    </div>
  );
}

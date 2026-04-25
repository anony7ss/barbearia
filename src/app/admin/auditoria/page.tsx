import { AdminPaginationLinks } from "@/components/admin/pagination-links";
import { requireAdmin } from "@/lib/server/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AuditSearchParams = Promise<{ auditPage?: string | string[]; statusPage?: string | string[] }>;

const auditPageSize = 10;
const statusHistoryPageSize = 8;

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

type StatusHistoryRow = {
  id: string;
  appointment_id: string;
  previous_status: string | null;
  next_status: string;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
};

type AuditContext = {
  actors: Map<string, string>;
  appointments: Map<string, string>;
  barbers: Map<string, string>;
  services: Map<string, string>;
  profiles: Map<string, string>;
  galleryItems: Map<string, string>;
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: AuditSearchParams;
}) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: auditLogs }, { data: statusHistory }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id,actor_id,action,entity_table,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("appointment_status_history")
      .select("id,appointment_id,previous_status,next_status,reason,actor_id,created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const audits = (auditLogs ?? []) as AuditRow[];
  const histories = (statusHistory ?? []) as StatusHistoryRow[];
  const actorIds = uniqueStrings([
    ...audits.map((item) => item.actor_id),
    ...histories.map((item) => item.actor_id),
  ]);
  const appointmentIds = uniqueStrings([
    ...histories.map((item) => item.appointment_id),
    ...audits.filter((item) => item.entity_table === "appointments").map((item) => item.entity_id),
  ]);
  const barberIds = uniqueStrings(audits.filter((item) => item.entity_table === "barbers").map((item) => item.entity_id));
  const serviceIds = uniqueStrings(audits.filter((item) => item.entity_table === "services").map((item) => item.entity_id));
  const profileEntityIds = uniqueStrings(audits.filter((item) => item.entity_table === "profiles").map((item) => item.entity_id));
  const galleryEntityIds = uniqueStrings(audits.filter((item) => item.entity_table === "gallery_items").map((item) => item.entity_id));

  const [
    { data: actorProfiles },
    { data: appointmentDetailsRaw },
    { data: profileDetails },
    { data: galleryDetails },
  ] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id,full_name,role").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    appointmentIds.length
      ? supabase
          .from("appointments")
          .select("id,customer_name,starts_at,service_id,barber_id")
          .in("id", appointmentIds)
      : Promise.resolve({ data: [] }),
    profileEntityIds.length
      ? supabase.from("profiles").select("id,full_name,role").in("id", profileEntityIds)
      : Promise.resolve({ data: [] }),
    galleryEntityIds.length
      ? supabase.from("gallery_items").select("id,caption,alt_text,barber_id").in("id", galleryEntityIds)
      : Promise.resolve({ data: [] }),
  ]);

  const appointmentDetails = (appointmentDetailsRaw ?? []) as Array<{
    id: string;
    customer_name: string;
    starts_at: string;
    service_id: string | null;
    barber_id: string | null;
  }>;
  const resolvedBarberIds = uniqueStrings([
    ...barberIds,
    ...appointmentDetails.map((item) => item.barber_id),
    ...(galleryDetails ?? []).map((item) => item.barber_id),
  ]);
  const resolvedServiceIds = uniqueStrings([
    ...serviceIds,
    ...appointmentDetails.map((item) => item.service_id),
  ]);
  const [{ data: barberDetails }, { data: serviceDetails }] = await Promise.all([
    resolvedBarberIds.length
      ? supabase.from("barbers").select("id,name,slug").in("id", resolvedBarberIds)
      : Promise.resolve({ data: [] }),
    resolvedServiceIds.length
      ? supabase.from("services").select("id,name").in("id", resolvedServiceIds)
      : Promise.resolve({ data: [] }),
  ]);

  const context = buildAuditContext({
    actors: actorProfiles ?? [],
    appointments: appointmentDetails,
    barbers: barberDetails ?? [],
    services: serviceDetails ?? [],
    profiles: profileDetails ?? [],
    galleryItems: galleryDetails ?? [],
  });

  const auditTotalPages = getPageCount(audits.length, auditPageSize);
  const auditCurrentPage = clampPage(parsePageParam(query.auditPage), auditTotalPages);
  const paginatedAudits = paginate(audits, auditCurrentPage, auditPageSize);
  const statusTotalPages = getPageCount(histories.length, statusHistoryPageSize);
  const statusCurrentPage = clampPage(parsePageParam(query.statusPage), statusTotalPages);
  const paginatedHistories = paginate(histories, statusCurrentPage, statusHistoryPageSize);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Auditoria</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Acoes sensiveis.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Consulte alteracoes administrativas, mudancas de status e operacoes criticas do painel.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-smoke">
          <div className="border-r border-line px-5 py-4">
            <p className="text-2xl font-semibold">{audits.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Eventos</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-2xl font-semibold">{histories.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Status</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <h2 className="text-xl font-semibold">Logs administrativos</h2>
          <div className="mt-5 grid gap-3">
            {paginatedAudits.map((log) => {
              const audit = describeAudit(log, context);

              return (
                <article key={log.id} className="rounded-2xl border border-line bg-background/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", audit.dotClass)} />
                        <p className="font-semibold">{audit.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted">{audit.description}</p>
                    </div>
                    <time className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                      {formatDate(log.created_at)}
                    </time>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <MetaPill label="Entidade" value={audit.entityLabel} />
                    <MetaPill label="Responsavel" value={audit.actorLabel} />
                  </div>
                  {audit.changes.length ? (
                    <div className="mt-4 grid gap-2">
                      {audit.changes.map((change) => (
                        <div key={change} className="rounded-xl border border-line bg-black/20 px-3 py-2 text-sm text-muted">
                          {change}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!audits.length ? <p className="text-sm text-muted">Nenhum log encontrado.</p> : null}
            <AdminPaginationLinks
              currentPage={auditCurrentPage}
              totalPages={auditTotalPages}
              label="logs administrativos"
              hrefForPage={(page) => auditPageHref(page, statusCurrentPage)}
            />
          </div>
        </section>

        <aside className="rounded-[1.5rem] border border-line bg-smoke p-5">
          <h2 className="text-xl font-semibold">Historico de status</h2>
          <div className="mt-5 grid gap-3">
            {paginatedHistories.map((entry) => {
              const status = describeStatus(entry, context);

              return (
                <article key={entry.id} className="rounded-2xl border border-line bg-background/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{status.title}</p>
                      <p className="mt-1 text-sm text-muted">{status.description}</p>
                    </div>
                    <time className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                      {formatDate(entry.created_at)}
                    </time>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <MetaPill label="Agendamento" value={status.appointmentLabel} />
                    <MetaPill label="Responsavel" value={status.actorLabel} />
                  </div>
                  {entry.reason ? (
                    <p className="mt-3 rounded-xl border border-line bg-black/20 px-3 py-2 text-sm text-muted">
                      Motivo: {entry.reason}
                    </p>
                  ) : null}
                </article>
              );
            })}
            {!histories.length ? <p className="text-sm text-muted">Nenhuma mudanca de status encontrada.</p> : null}
            <AdminPaginationLinks
              currentPage={statusCurrentPage}
              totalPages={statusTotalPages}
              label="historico de status"
              hrefForPage={(page) => auditPageHref(auditCurrentPage, page)}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-black/20 px-3 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function buildAuditContext(input: {
  actors: Array<{ id: string; full_name: string | null; role: string | null }>;
  appointments: Array<{ id: string; customer_name: string; starts_at: string; service_id: string | null; barber_id: string | null }>;
  barbers: Array<{ id: string; name: string; slug?: string | null }>;
  services: Array<{ id: string; name: string }>;
  profiles: Array<{ id: string; full_name: string | null; role: string | null }>;
  galleryItems: Array<{ id: string; caption: string | null; alt_text: string | null; barber_id: string | null }>;
}): AuditContext {
  const barberMap = new Map(input.barbers.map((barber) => [barber.id, barber.name]));
  const serviceMap = new Map(input.services.map((service) => [service.id, service.name]));

  return {
    actors: new Map(input.actors.map((profile) => [profile.id, formatProfileLabel(profile.full_name, profile.role)])),
    appointments: new Map(input.appointments.map((appointment) => [appointment.id, formatAppointmentLabel(appointment, serviceMap, barberMap)])),
    barbers: barberMap,
    services: serviceMap,
    profiles: new Map(input.profiles.map((profile) => [profile.id, formatProfileLabel(profile.full_name, profile.role)])),
    galleryItems: new Map(
      input.galleryItems.map((item) => [
        item.id,
        item.caption?.trim() || item.alt_text?.trim() || (item.barber_id ? `Galeria de ${barberMap.get(item.barber_id) ?? `barbeiro ${item.barber_id.slice(0, 8)}`}` : "Item da galeria"),
      ]),
    ),
  };
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

function auditPageHref(auditPage: number, statusPage: number) {
  const params = new URLSearchParams();
  if (auditPage > 1) params.set("auditPage", String(auditPage));
  if (statusPage > 1) params.set("statusPage", String(statusPage));
  const query = params.toString();
  return query ? `/admin/auditoria?${query}` : "/admin/auditoria";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

type AuditMetadata = {
  old?: Record<string, unknown> | null;
  new?: Record<string, unknown> | null;
  deleted_at?: unknown;
};

const tableLabels: Record<string, string> = {
  profiles: "Perfil",
  barbers: "Barbeiro",
  services: "Servico",
  appointments: "Agendamento",
  availability_rules: "Regra de disponibilidade",
  blocked_slots: "Bloqueio de horario",
  loyalty_events: "Fidelidade",
  notification_jobs: "Job de notificacao",
  appointment_reviews: "Avaliacao",
  gallery_items: "Galeria",
  business_settings: "Configuracao",
};

const actionLabels: Record<string, string> = {
  INSERT: "criado",
  UPDATE: "atualizado",
  DELETE: "removido",
  SOFT_DELETE: "desativado",
};

const fieldLabels: Record<string, string> = {
  role: "Permissao",
  phone: "Telefone",
  full_name: "Nome",
  is_active: "Status",
  deleted_at: "Desativado em",
  loyalty_points: "Pontos",
  preferred_barber_id: "Barbeiro preferido",
  internal_notes: "Notas internas",
  name: "Nome",
  slug: "Slug",
  bio: "Bio",
  specialties: "Especialidades",
  photo_url: "Foto",
  rating: "Avaliacao",
  review_count: "Total de avaliacoes",
  is_featured: "Destaque",
  display_order: "Ordem",
  description: "Descricao",
  duration_minutes: "Duracao",
  buffer_minutes: "Intervalo",
  price_cents: "Preco",
  barber_id: "Barbeiro",
  service_id: "Servico",
  starts_at: "Inicio",
  ends_at: "Fim",
  status: "Status",
  customer_name: "Cliente",
  customer_email: "Email",
  customer_phone: "Telefone",
  notes: "Observacoes",
  cancel_reason: "Motivo do cancelamento",
  cancelled_at: "Cancelado em",
  weekday: "Dia da semana",
  start_time: "Abre",
  end_time: "Fecha",
  break_start: "Inicio do intervalo",
  break_end: "Fim do intervalo",
  reason: "Motivo",
  is_public: "Visibilidade no site",
  caption: "Legenda",
  alt_text: "Texto alternativo",
  is_cover: "Capa da galeria",
  sort_order: "Ordem",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado",
  no_show: "No-show",
};

const roleLabels: Record<string, string> = {
  client: "Cliente",
  barber: "Barbeiro",
  admin: "Admin",
};

const hiddenFields = new Set([
  "id",
  "created_at",
  "updated_at",
  "user_id",
  "guest_access_token_hash",
  "access_token_hash",
  "ip_hash",
  "user_agent_hash",
  "metadata",
  "comment",
  "photo_storage_path",
  "storage_path",
  "external_url",
]);

function describeAudit(log: AuditRow, context: AuditContext) {
  const action = log.action.toUpperCase();
  const table = tableLabels[log.entity_table] ?? log.entity_table;
  const metadata = asMetadata(log.metadata);
  const oldValue = asRecord(metadata.old);
  const newValue = asRecord(metadata.new);
  const actorLabel = resolveActorLabel(log.actor_id, context);
  const entityLabel = resolveEntityLabel(log, newValue ?? oldValue, context, table);
  const subject = getSubject(newValue ?? oldValue, entityLabel);
  const changes = action === "UPDATE" ? diffRecords(oldValue, newValue, context) : creationSummary(newValue ?? oldValue, context);
  const actionLabel = actionLabels[action] ?? log.action.toLowerCase();

  if (action === "SOFT_DELETE") {
    return {
      title: `${table} desativado`,
      description: `${actorLabel} desativou ${subject}.`,
      entityLabel,
      actorLabel,
      changes: metadata.deleted_at ? [`Desativado em: ${formatLooseValue(metadata.deleted_at)}`] : [],
      dotClass: "bg-red-400",
    };
  }

  const description = action === "INSERT"
    ? `${actorLabel} criou ${subject}.`
    : action === "DELETE"
      ? `${actorLabel} removeu ${subject}.`
      : changes.length
        ? `${actorLabel} alterou ${subject}.`
        : `${actorLabel} registrou uma atualizacao em ${subject}.`;

  return {
    title: `${table} ${actionLabel}`,
    description,
    entityLabel,
    actorLabel,
    changes,
    dotClass: action === "DELETE" ? "bg-red-400" : action === "INSERT" ? "bg-emerald-400" : "bg-brass",
  };
}

function describeStatus(entry: StatusHistoryRow, context: AuditContext) {
  const previous = entry.previous_status ? statusLabels[entry.previous_status] ?? entry.previous_status : null;
  const next = statusLabels[entry.next_status] ?? entry.next_status;
  const appointmentLabel = context.appointments.get(entry.appointment_id) ?? `Agendamento ${entry.appointment_id.slice(0, 8)}`;
  const actorLabel = resolveActorLabel(entry.actor_id, context);

  if (!previous) {
    return {
      title: "Agendamento criado",
      description: `${actorLabel} definiu o status inicial como ${next}.`,
      appointmentLabel,
      actorLabel,
    };
  }

  return {
    title: "Status alterado",
    description: `${actorLabel} mudou de ${previous} para ${next}.`,
    appointmentLabel,
    actorLabel,
  };
}

function asMetadata(value: unknown): AuditMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AuditMetadata;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function diffRecords(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null, context: AuditContext) {
  if (!oldValue || !newValue) return [];

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  return [...keys]
    .filter((key) => !hiddenFields.has(key))
    .filter((key) => JSON.stringify(oldValue[key] ?? null) !== JSON.stringify(newValue[key] ?? null))
    .slice(0, 8)
    .map((key) => `${fieldLabels[key] ?? key}: ${formatFieldValue(key, oldValue[key], context)} -> ${formatFieldValue(key, newValue[key], context)}`);
}

function creationSummary(value: Record<string, unknown> | null, context: AuditContext) {
  if (!value) return [];

  return Object.entries(value)
    .filter(([key, fieldValue]) => !hiddenFields.has(key) && fieldValue !== null && fieldValue !== "")
    .slice(0, 4)
    .map(([key, fieldValue]) => `${fieldLabels[key] ?? key}: ${formatFieldValue(key, fieldValue, context)}`);
}

function getSubject(value: Record<string, unknown> | null, fallback: string) {
  const name = value?.full_name ?? value?.name ?? value?.customer_name ?? value?.code;
  return typeof name === "string" && name.trim() ? name : fallback;
}

function resolveActorLabel(actorId: string | null, context: AuditContext) {
  if (!actorId) return "Sistema";
  return context.actors.get(actorId) ?? `Admin ${actorId.slice(0, 8)}`;
}

function resolveEntityLabel(
  log: AuditRow,
  value: Record<string, unknown> | null,
  context: AuditContext,
  fallback: string,
) {
  if (log.entity_table === "profiles" && log.entity_id) {
    return context.profiles.get(log.entity_id) ?? getSubject(value, fallback);
  }

  if (log.entity_table === "barbers" && log.entity_id) {
    return context.barbers.get(log.entity_id) ?? getSubject(value, fallback);
  }

  if (log.entity_table === "services" && log.entity_id) {
    return context.services.get(log.entity_id) ?? getSubject(value, fallback);
  }

  if (log.entity_table === "appointments" && log.entity_id) {
    return context.appointments.get(log.entity_id) ?? getSubject(value, fallback);
  }

  if (log.entity_table === "gallery_items" && log.entity_id) {
    return context.galleryItems.get(log.entity_id) ?? getSubject(value, fallback);
  }

  return getSubject(value, fallback);
}

function formatProfileLabel(fullName: string | null, role: string | null) {
  const name = fullName?.trim() || "Perfil";
  const roleLabel = role && roleLabels[role] ? roleLabels[role] : role;
  return roleLabel ? `${name} (${roleLabel.toLowerCase()})` : name;
}

function formatAppointmentLabel(
  appointment: {
  customer_name: string;
  starts_at: string;
  service_id: string | null;
  barber_id: string | null;
},
  serviceMap: Map<string, string>,
  barberMap: Map<string, string>,
) {
  const serviceName = appointment.service_id ? (serviceMap.get(appointment.service_id) ?? "Servico") : "Servico";
  const barberName = appointment.barber_id ? barberMap.get(appointment.barber_id) : null;
  const startLabel = formatDate(appointment.starts_at);
  return barberName
    ? `${appointment.customer_name} - ${serviceName} com ${barberName} (${startLabel})`
    : `${appointment.customer_name} - ${serviceName} (${startLabel})`;
}

function formatFieldValue(key: string, value: unknown, context: AuditContext) {
  if (key === "role" && typeof value === "string") return roleLabels[value] ?? value;
  if (key === "status" && typeof value === "string") return statusLabels[value] ?? value;
  if (key === "is_active" && typeof value === "boolean") return value ? "Ativo" : "Inativo";
  if (key === "is_public" && typeof value === "boolean") return value ? "Publica" : "Privada";
  if (key === "is_featured" && typeof value === "boolean") return value ? "Em destaque" : "Sem destaque";
  if (key === "is_cover" && typeof value === "boolean") return value ? "Capa" : "Item comum";
  if ((key === "barber_id" || key === "preferred_barber_id") && typeof value === "string") {
    return context.barbers.get(value) ?? value.slice(0, 8);
  }
  if (key === "service_id" && typeof value === "string") {
    return context.services.get(value) ?? value.slice(0, 8);
  }
  if (key.endsWith("_at") && typeof value === "string") return formatDate(value);
  if (key === "price_cents" && typeof value === "number") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
  return formatLooseValue(value);
}

function formatLooseValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (Array.isArray(value)) return value.join(", ") || "vazio";
  if (typeof value === "object") return "dados atualizados";
  return String(value);
}

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
}).strict();

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
};

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
};

type BarberRow = {
  id: string;
  name: string;
  slug: string;
  specialties: string[] | null;
  is_active: boolean;
};

type AppointmentRow = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  starts_at: string;
  status: string;
  services?: { name?: string } | Array<{ name?: string }> | null;
  barbers?: { name?: string } | Array<{ name?: string }> | null;
};

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
};

type AdminSearchResult = {
  id: string;
  type: "Painel" | "Atalho" | "Cliente" | "Agendamento" | "Servico" | "Barbeiro" | "Mensagem";
  title: string;
  detail: string;
  href: string;
};

const adminSearchIndex: Array<AdminSearchResult & { keywords: string[] }> = [
  {
    id: "page-dashboard",
    type: "Painel",
    title: "Dashboard",
    detail: "metricas, receita, ocupacao, proximos horarios e alertas",
    href: "/admin",
    keywords: ["inicio", "visao geral", "painel", "operacao", "receita", "ocupacao", "metricas", "alertas"],
  },
  {
    id: "page-agenda",
    type: "Painel",
    title: "Agenda",
    detail: "agendamentos, calendario, status, remarcacao e atendimento",
    href: "/admin/agenda",
    keywords: ["horarios", "calendario", "atendimentos", "novo agendamento", "cancelar", "concluir", "no-show", "remarcar"],
  },
  {
    id: "page-clientes",
    type: "Painel",
    title: "Clientes e perfis",
    detail: "usuarios, roles, historico, pontos, no-shows e avaliacoes",
    href: "/admin/clientes",
    keywords: ["perfil", "perfis", "cliente", "clientes", "usuario", "usuarios", "permissoes", "roles", "fidelidade", "pontos", "avaliacoes"],
  },
  {
    id: "page-barbeiros",
    type: "Painel",
    title: "Barbeiros",
    detail: "equipe, profissionais, usuario vinculado e agenda do barbeiro",
    href: "/admin/barbeiros",
    keywords: ["equipe", "profissional", "profissionais", "barber", "vincular usuario", "especialidades", "agenda propria"],
  },
  {
    id: "page-servicos",
    type: "Painel",
    title: "Servicos",
    detail: "catalogo, precos, duracao, cortes e barba",
    href: "/admin/servicos",
    keywords: ["servico", "servicos", "catalogo", "preco", "precos", "valor", "valores", "duracao", "corte", "barba"],
  },
  {
    id: "page-disponibilidade",
    type: "Painel",
    title: "Disponibilidade",
    detail: "horarios de funcionamento, bloqueios, folgas, ferias e pausas",
    href: "/admin/disponibilidade",
    keywords: ["bloqueio", "bloqueios", "folga", "folgas", "ferias", "escala", "escalas", "pausa", "pausas", "funcionamento"],
  },
  {
    id: "page-relatorios",
    type: "Painel",
    title: "Relatorios",
    detail: "filtros por periodo, barbeiro, servico, status, origem e desempenho",
    href: "/admin/relatorios",
    keywords: ["relatorio", "relatorios", "periodo", "datas", "desempenho", "ticket medio", "ranking", "receita", "cancelamentos"],
  },
  {
    id: "page-contato",
    type: "Painel",
    title: "Mensagens de contato",
    detail: "caixa de entrada, email, whatsapp e retorno rapido",
    href: "/admin/contato",
    keywords: ["contato", "mensagem", "mensagens", "email", "whatsapp", "caixa de entrada", "lead", "atendimento"],
  },
  {
    id: "page-notificacoes",
    type: "Painel",
    title: "Notificacoes",
    detail: "emails, Resend, cron, jobs, lembretes e falhas",
    href: "/admin/notificacoes",
    keywords: ["email", "emails", "resend", "cron", "job", "jobs", "lembrete", "lembretes", "falha", "falhas"],
  },
  {
    id: "page-configuracoes",
    type: "Painel",
    title: "Configuracoes",
    detail: "regras gerais, WhatsApp, endereco, timezone, cancelamento e reagendamento",
    href: "/admin/configuracoes",
    keywords: ["ajustes", "regras", "whatsapp", "telefone", "endereco", "timezone", "antecedencia", "cancelamento", "reagendamento", "slots"],
  },
  {
    id: "page-auditoria",
    type: "Painel",
    title: "Auditoria",
    detail: "logs, seguranca, alteracoes sensiveis e rastreio operacional",
    href: "/admin/auditoria",
    keywords: ["logs", "seguranca", "auditoria", "eventos", "alteracoes", "historico tecnico", "admin"],
  },
  {
    id: "action-new-appointment",
    type: "Atalho",
    title: "Novo agendamento",
    detail: "criar horario manual na agenda",
    href: "/admin/agenda",
    keywords: ["criar agendamento", "novo horario", "marcar cliente", "agenda manual"],
  },
  {
    id: "action-new-service",
    type: "Atalho",
    title: "Criar servico",
    detail: "adicionar corte, barba, pacote, preco e duracao",
    href: "/admin/servicos",
    keywords: ["novo servico", "adicionar servico", "cadastrar servico", "preco novo"],
  },
  {
    id: "action-new-block",
    type: "Atalho",
    title: "Adicionar bloqueio",
    detail: "bloquear periodo, folga, ferias ou manutencao",
    href: "/admin/disponibilidade",
    keywords: ["novo bloqueio", "bloquear horario", "bloquear dia", "ferias", "folga"],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get("q") ?? "",
    });

    if (!parsed.success) {
      throw new ApiError(400, "Busca invalida.");
    }

    const term = normalizeSearchTerm(parsed.data.q);
    if (term.length < 2) {
      return jsonOk({ results: [] satisfies AdminSearchResult[] });
    }

    const pattern = `%${term}%`;
    const staticResults = getStaticSearchResults(term);
    const roleFilter = getRoleFilter(term);
    const statusFilter = getAppointmentStatusFilter(term);
    const numericTerm = parseNumericTerm(term);
    const profileFilters = [
      `full_name.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `internal_notes.ilike.${pattern}`,
      ...(roleFilter ? [`role.eq.${roleFilter}`] : []),
    ].join(",");
    const appointmentFilters = [
      `customer_name.ilike.${pattern}`,
      `customer_phone.ilike.${pattern}`,
      `customer_email.ilike.${pattern}`,
      `guest_lookup_code.eq.${term}`,
      `notes.ilike.${pattern}`,
      `internal_notes.ilike.${pattern}`,
      `cancel_reason.ilike.${pattern}`,
      ...(statusFilter ? [`status.eq.${statusFilter}`] : []),
    ].join(",");
    const serviceFilters = [
      `name.ilike.${pattern}`,
      `slug.ilike.${pattern}`,
      `description.ilike.${pattern}`,
      ...(numericTerm !== null ? [`duration_minutes.eq.${numericTerm}`, `price_cents.eq.${numericTerm}`, `price_cents.eq.${numericTerm * 100}`] : []),
    ].join(",");
    const contactStatusFilter = getContactStatusFilter(term);
    const contactFilters = [
      `name.ilike.${pattern}`,
      `email.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `message.ilike.${pattern}`,
      ...(contactStatusFilter ? [`status.eq.${contactStatusFilter}`] : []),
    ].join(",");

    const [profilesResult, appointmentsResult, servicesResult, barbersResult, contactMessagesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,phone,role")
        .is("deleted_at", null)
        .or(profileFilters)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("appointments")
        .select("id,user_id,customer_name,customer_phone,starts_at,status,services(name),barbers(name)")
        .or(appointmentFilters)
        .order("starts_at", { ascending: false })
        .limit(10),
      supabase
        .from("services")
        .select("id,name,slug,price_cents,duration_minutes,is_active")
        .or(serviceFilters)
        .order("display_order", { ascending: true })
        .limit(10),
      supabase
        .from("barbers")
        .select("id,name,slug,specialties,is_active")
        .or(`name.ilike.${pattern},slug.ilike.${pattern},bio.ilike.${pattern}`)
        .order("display_order", { ascending: true })
        .limit(10),
      supabase
        .from("contact_messages")
        .select("id,name,email,phone,message,status")
        .or(contactFilters)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (barbersResult.error) throw barbersResult.error;
    if (contactMessagesResult.error) throw contactMessagesResult.error;

    const results: AdminSearchResult[] = [
      ...staticResults,
      ...((profilesResult.data ?? []) as ProfileRow[]).map((profile) => ({
        id: `profile-${profile.id}`,
        type: "Cliente" as const,
        title: profile.full_name ?? "Cliente sem nome",
        detail: [profile.phone, profile.role].filter(Boolean).join(" - ") || "perfil cadastrado",
        href: `/admin/clientes/${profile.id}`,
      })),
      ...((appointmentsResult.data ?? []) as unknown as AppointmentRow[]).map((appointment) => ({
        id: `appointment-${appointment.id}`,
        type: "Agendamento" as const,
        title: `${appointment.customer_name} - ${formatShortDate(appointment.starts_at)}`,
        detail: [
          serviceName(appointment),
          barberName(appointment),
          appointment.status.replace("_", "-"),
        ].filter(Boolean).join(" - "),
        href: appointment.user_id ? `/admin/clientes/${appointment.user_id}` : "/admin/agenda",
      })),
      ...((servicesResult.data ?? []) as ServiceRow[]).map((service) => ({
        id: `service-${service.id}`,
        type: "Servico" as const,
        title: service.name,
        detail: `${formatCurrency(service.price_cents)} - ${service.duration_minutes} min - ${service.is_active ? "ativo" : "inativo"}`,
        href: "/admin/servicos",
      })),
      ...((barbersResult.data ?? []) as BarberRow[]).map((barber) => ({
        id: `barber-${barber.id}`,
        type: "Barbeiro" as const,
        title: barber.name,
        detail: [barber.specialties?.slice(0, 2).join(", "), barber.is_active ? "ativo" : "inativo"].filter(Boolean).join(" - "),
        href: "/admin/barbeiros",
      })),
      ...((contactMessagesResult.data ?? []) as ContactMessageRow[]).map((message) => ({
        id: `message-${message.id}`,
        type: "Mensagem" as const,
        title: message.name,
        detail: [message.email, message.phone, message.status, compactMessage(message.message)].filter(Boolean).join(" - "),
        href: `/admin/contato?message=${message.id}`,
      })),
    ].slice(0, 32);

    return jsonOk({ results });
  } catch (error) {
    return jsonError(error);
  }
}

function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s@+.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function getStaticSearchResults(term: string) {
  const needle = normalizeComparable(term);

  return adminSearchIndex
    .map((item) => ({ item, score: getIndexScore(item, needle) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 12)
    .map(({ item }) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      detail: item.detail,
      href: item.href,
    }));
}

function getIndexScore(item: AdminSearchResult & { keywords: string[] }, needle: string) {
  const title = normalizeComparable(item.title);
  const detail = normalizeComparable(item.detail);
  const keywords = item.keywords.map(normalizeComparable);
  const haystack = [title, detail, ...keywords].join(" ");

  if (title === needle) return 100;
  if (title.startsWith(needle)) return 90;
  if (keywords.some((keyword) => keyword === needle)) return 85;
  if (keywords.some((keyword) => keyword.startsWith(needle))) return 75;
  if (haystack.includes(needle)) return 55;
  return 0;
}

function getRoleFilter(term: string) {
  const normalized = term.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "barber" || normalized === "barbeiro") return "barber";
  if (normalized === "client" || normalized === "cliente") return "client";
  return null;
}

function getAppointmentStatusFilter(term: string) {
  const normalized = normalizeComparable(term);
  if (["pendente", "pending"].includes(normalized)) return "pending";
  if (["confirmado", "confirmada", "confirmed"].includes(normalized)) return "confirmed";
  if (["concluido", "concluida", "completed"].includes(normalized)) return "completed";
  if (["cancelado", "cancelada", "cancelled", "canceled"].includes(normalized)) return "cancelled";
  if (["no-show", "noshow", "no show"].includes(normalized)) return "no_show";
  return null;
}

function getContactStatusFilter(term: string) {
  const normalized = normalizeComparable(term);
  if (["nova", "novo", "new"].includes(normalized)) return "new";
  if (["lida", "lido", "read"].includes(normalized)) return "read";
  if (["arquivada", "arquivado", "archived"].includes(normalized)) return "archived";
  return null;
}

function parseNumericTerm(term: string) {
  if (!/^\d{1,7}$/.test(term)) return null;
  return Number(term);
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9@+.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function serviceName(appointment: AppointmentRow) {
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  return service?.name ?? "Servico";
}

function barberName(appointment: AppointmentRow) {
  const barber = Array.isArray(appointment.barbers) ? appointment.barbers[0] : appointment.barbers;
  return barber?.name ?? "Barbeiro";
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function compactMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

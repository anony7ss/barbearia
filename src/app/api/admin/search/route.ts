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

type AdminSearchResult = {
  id: string;
  type: "Cliente" | "Agendamento" | "Servico" | "Barbeiro";
  title: string;
  detail: string;
  href: string;
};

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
    const roleFilter = getRoleFilter(term);
    const profileFilters = [
      `full_name.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      ...(roleFilter ? [`role.eq.${roleFilter}`] : []),
    ].join(",");

    const [profilesResult, appointmentsResult, servicesResult, barbersResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,phone,role")
        .is("deleted_at", null)
        .or(profileFilters)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("appointments")
        .select("id,user_id,customer_name,customer_phone,starts_at,status,services(name),barbers(name)")
        .or(`customer_name.ilike.${pattern},customer_phone.ilike.${pattern},customer_email.ilike.${pattern}`)
        .order("starts_at", { ascending: false })
        .limit(5),
      supabase
        .from("services")
        .select("id,name,slug,price_cents,duration_minutes,is_active")
        .or(`name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`)
        .order("display_order", { ascending: true })
        .limit(5),
      supabase
        .from("barbers")
        .select("id,name,slug,specialties,is_active")
        .or(`name.ilike.${pattern},slug.ilike.${pattern},bio.ilike.${pattern}`)
        .order("display_order", { ascending: true })
        .limit(5),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (barbersResult.error) throw barbersResult.error;

    const results: AdminSearchResult[] = [
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
    ].slice(0, 12);

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

function getRoleFilter(term: string) {
  const normalized = term.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "barber" || normalized === "barbeiro") return "barber";
  if (normalized === "client" || normalized === "cliente") return "client";
  return null;
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

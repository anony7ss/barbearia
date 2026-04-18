import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, History, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AppointmentCard, AppointmentLookup } from "@/components/booking/appointment-lookup";
import { PublicShell } from "@/components/site/public-shell";
import { EmptyState } from "@/components/ui/state";
import { getAppointmentPolicy } from "@/lib/appointment-policy";
import { getAuthenticatedUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus agendamentos",
  description: "Consulte, cancele ou acompanhe seus agendamentos.",
};

export default async function MyAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const params = await searchParams;
  if (params.id && params.token) {
    redirect(
      `/api/booking/access?appointmentId=${params.id}` +
        `&token=${encodeURIComponent(params.token)}` +
        `&next=${encodeURIComponent("/meus-agendamentos")}`,
    );
  }

  const { supabase, user } = await getAuthenticatedUser().catch(() => ({ supabase: null, user: null }));
  const [appointments, settings, profile] = user && supabase
    ? await Promise.all([
        supabase
          .from("appointments")
          .select("id,service_id,barber_id,starts_at,ends_at,status,customer_name,customer_email,customer_phone,services(name,price_cents,duration_minutes),barbers(name)")
          .eq("user_id", user.id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("business_settings")
          .select("cancellation_limit_minutes,reschedule_limit_minutes")
          .eq("id", true)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("role,full_name,is_active,deleted_at")
          .eq("id", user.id)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }, { data: null }];
  const appointmentList = (appointments.data ?? []).map((appointment) => ({
    ...appointment,
    policy: getAppointmentPolicy(appointment, settings.data),
  }));
  const now = Date.now();
  const upcomingAppointments = appointmentList
    .filter((appointment) => {
      const activeStatus = !["cancelled", "no_show"].includes(appointment.status);
      return activeStatus && new Date(appointment.starts_at).getTime() >= now;
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const historyCount = Math.max(appointmentList.length - upcomingAppointments.length, 0);

  return (
    <PublicShell
      navbarProps={
        user
          ? {
              initialIsAuthenticated: true,
              initialIsAdmin:
                profile.data?.role === "admin" &&
                profile.data?.is_active === true &&
                profile.data?.deleted_at === null,
              initialIsBarber:
                profile.data?.role === "barber" &&
                profile.data?.is_active === true &&
                profile.data?.deleted_at === null,
              initialUserName: profile.data?.full_name ?? user.user_metadata.full_name ?? null,
              initialUserEmail: user.email ?? null,
            }
          : undefined
      }
    >
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Meus horarios
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Consulte, cancele ou reagende sem friccao.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Clientes logados veem historico completo. Convidados usam codigo,
              contato ou o link seguro recebido na confirmacao.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <AppointmentStat
              icon={<CalendarClock size={17} />}
              value={`${upcomingAppointments.length}`}
              label="proximos horarios"
            />
            <AppointmentStat
              icon={<History size={17} />}
              value={`${historyCount}`}
              label="no historico"
            />
            <AppointmentStat
              icon={<ShieldCheck size={17} />}
              value={user ? "logado" : "codigo"}
              label="forma de acesso"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full border border-line text-brass">
                <Search size={17} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Consulta rapida</h2>
                <p className="mt-1 text-sm text-muted">Nao precisa criar conta.</p>
              </div>
            </div>
            <AppointmentLookup tokenId={params.id} token={params.token} />
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Area do cliente</h2>
                <p className="mt-1 text-sm text-muted">
                  Historico, proximos horarios e acoes permitidas.
                </p>
              </div>
            </div>
            {!user ? (
              <EmptyState title="Entre para ver seu historico" description="A consulta por codigo continua disponivel sem conta." />
            ) : !appointmentList.length ? (
              <EmptyState title="Nenhum agendamento na conta" />
            ) : (
              <div className="grid gap-3">
                {appointmentList.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment as never} canManage />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </PublicShell>
  );
}

function AppointmentStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-smoke p-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  );
}

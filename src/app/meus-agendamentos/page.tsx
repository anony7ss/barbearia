import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Meus horarios
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
            Consulte sem atrito.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Clientes logados veem historico completo. Convidados usam codigo e
            contato ou o link seguro recebido na confirmacao.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Consulta rapida</h2>
            <AppointmentLookup tokenId={params.id} token={params.token} />
          </section>
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Area do cliente</h2>
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

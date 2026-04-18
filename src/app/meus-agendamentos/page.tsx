import type { Metadata } from "next";
import Link from "next/link";
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
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Meus horarios
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
            Encontre seu agendamento.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Acesse pela conta ou consulte um horario especifico pelo codigo de confirmacao.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Sem login</p>
              <h2 className="mt-2 text-2xl font-semibold">Consulta rapida</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Informe codigo e telefone ou email usados no agendamento.
              </p>
            </div>
            <AppointmentLookup tokenId={params.id} token={params.token} />
          </section>
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Com conta</p>
                <h2 className="mt-2 text-2xl font-semibold">Sua agenda</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Historico e acoes permitidas ficam reunidos aqui.
                </p>
              </div>
            </div>
            {!user ? (
              <div className="rounded-[1.5rem] border border-line bg-smoke p-5">
                <h3 className="text-xl font-semibold">Entre para ver tudo</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Sua conta mostra proximos horarios, historico e preferencias.
                </p>
                <Link
                  href="/login"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink"
                >
                  Entrar
                </Link>
              </div>
            ) : !appointmentList.length ? (
              <EmptyState title="Nenhum agendamento na conta" description="Quando voce agendar logado, o horario aparece aqui." />
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

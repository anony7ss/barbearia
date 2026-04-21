import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow, type BookingFlowBarber, type BookingFlowService } from "@/components/booking/booking-flow";
import { LoadingState } from "@/components/ui/state";
import { PublicShell } from "@/components/site/public-shell";
import { getAuthenticatedUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agendamento",
  description: "Agende corte, barba e servicos premium sem criar conta.",
};

export default async function BookingPage() {
  const { supabase, user } = await getAuthenticatedUser().catch(() => ({ supabase: null, user: null }));
  const [preferences, profile, servicesResult, barbersResult] = supabase
    ? await Promise.all([
        user
          ? supabase
              .from("client_preferences")
              .select("favorite_barber_id,favorite_service_id,personal_notes")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from("profiles")
              .select("role,full_name,phone,is_active,deleted_at")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("services")
          .select("id,name,slug,duration_minutes,price_cents,display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("barbers")
          .select("id,name,slug,specialties,display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }];

  const serviceOptions: BookingFlowService[] = (servicesResult.data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    slug: service.slug,
    durationMinutes: service.duration_minutes,
    priceCents: service.price_cents,
  }));

  const barberOptions: BookingFlowBarber[] = (barbersResult.data ?? []).map((barber) => ({
    id: barber.id,
    name: barber.name,
    slug: barber.slug,
    specialties: Array.isArray(barber.specialties) ? barber.specialties : [],
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
      <section className="px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Agendamento
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Marque sem criar conta.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            O fluxo mostra apenas horarios validos e confirma com codigo para
            consulta rapida depois.
          </p>
        </div>
        <Suspense fallback={<LoadingState title="Preparando agenda" />}>
          <BookingFlow
            services={serviceOptions}
            barbers={barberOptions}
            initialPreferences={{
              serviceId: preferences.data?.favorite_service_id ?? null,
              barberId: preferences.data?.favorite_barber_id ?? null,
              notes: preferences.data?.personal_notes ?? null,
              customerName: profile.data?.full_name ?? user?.user_metadata.full_name ?? null,
              customerEmail: user?.email ?? null,
              customerPhone: profile.data?.phone ?? null,
            }}
          />
        </Suspense>
      </section>
    </PublicShell>
  );
}

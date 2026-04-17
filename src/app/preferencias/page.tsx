import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PreferencesForm } from "@/components/account/preferences-form";
import { PublicShell } from "@/components/site/public-shell";
import { getAuthenticatedUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preferencias",
  description: "Salve barbeiro favorito, servico recorrente e preferencias de atendimento.",
};

export default async function PreferencesPage() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?redirect=/preferencias");
  }

  const [{ data: preferences }, { data: barbers }, { data: services }] = await Promise.all([
    supabase
      .from("client_preferences")
      .select("favorite_barber_id,favorite_service_id,personal_notes,birthday,marketing_opt_in")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("barbers").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("services").select("id,name").eq("is_active", true).order("display_order"),
  ]);

  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Area do cliente
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
            Suas preferencias.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Salve o que voce costuma pedir e acelere os proximos agendamentos.
          </p>
        </div>

        <PreferencesForm
          preferences={preferences}
          barbers={barbers ?? []}
          services={services ?? []}
        />

        <div className="mt-5">
          <Link href="/meus-agendamentos" className="text-sm font-semibold text-brass hover:text-foreground">
            Ver meus agendamentos
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

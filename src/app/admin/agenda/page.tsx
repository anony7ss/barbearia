import Link from "next/link";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { AgendaBoard } from "@/components/admin/agenda-board";
import { AppointmentsManager } from "@/components/admin/appointments-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminAgendaPage() {
  const { supabase } = await requireAdmin();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [{ data }, { data: barbers }, { data: services }, { data: clients }, { data: statusHistory }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*,services(name,price_cents,duration_minutes),barbers(name)")
      .gte("starts_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at", { ascending: true })
      .limit(250),
    supabase
      .from("barbers")
      .select("id,name")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("services")
      .select("id,name,price_cents,duration_minutes")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("profiles")
      .select("id,full_name,phone")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("appointment_status_history")
      .select("id,appointment_id,previous_status,next_status,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Header title="Agenda" subtitle="Visao diaria por barbeiro, mapa semanal e lista operacional." />
      <div className="mb-6 flex flex-wrap gap-2">
        <ExportLink href="/api/admin/appointments/export">Exportar agendamentos</ExportLink>
        <ExportLink href="/api/admin/clients/export">Exportar clientes</ExportLink>
      </div>
      <AgendaBoard appointments={(data ?? []) as never} barbers={(barbers ?? []) as never} />
      <section className="mt-8">
        <AppointmentsManager
          initialAppointments={(data ?? []) as never}
          barbers={(barbers ?? []) as never}
          services={(services ?? []) as never}
          clients={(clients ?? []) as never}
          statusHistory={(statusHistory ?? []) as never}
        />
      </section>
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </div>
  );
}

function ExportLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
    >
      <Download size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

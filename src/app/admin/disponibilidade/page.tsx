import { AvailabilityManager } from "@/components/admin/availability-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  const { supabase } = await requireAdmin();
  const [{ data: barbers }, { data: rules }, { data: blocks }] = await Promise.all([
    supabase.from("barbers").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("availability_rules").select("*,barbers(name)").order("weekday"),
    supabase.from("blocked_slots").select("*,barbers(name)").gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Disponibilidade</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Escala e bloqueios.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Configure horarios recorrentes, intervalos, folgas e periodos fechados sem afetar outros dados da agenda.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-smoke">
          <div className="border-r border-line px-5 py-4">
            <p className="text-2xl font-semibold">{rules?.length ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Regras</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-2xl font-semibold">{blocks?.length ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Bloqueios</p>
          </div>
        </div>
      </div>
      <AvailabilityManager
        barbers={(barbers ?? []) as never}
        initialRules={(rules ?? []) as never}
        initialBlocks={(blocks ?? []) as never}
      />
    </main>
  );
}

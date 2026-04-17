import { ServiceManager } from "@/components/admin/service-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("*").order("display_order");
  const services = data ?? [];
  const active = services.filter((service) => service.is_active).length;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Servicos</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Catalogo comercial.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Crie, precifique e organize servicos que alimentam a disponibilidade real da agenda.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-smoke">
          <div className="border-r border-line px-5 py-4">
            <p className="text-2xl font-semibold">{active}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Ativos</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-2xl font-semibold">{services.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Total</p>
          </div>
        </div>
      </div>
      <ServiceManager initialServices={services as never} />
    </main>
  );
}

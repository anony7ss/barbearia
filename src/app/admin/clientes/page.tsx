import { ClientManager } from "@/components/admin/client-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: clients }, { data: barbers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,phone,role,loyalty_points,preferred_barber_id,internal_notes,is_active,deleted_at,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("barbers")
      .select("id,name")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const loadedClients = clients ?? [];
  const admins = loadedClients.filter((client) => client.role === "admin").length;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Clientes</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Base e permissoes.
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Controle dados operacionais, fidelidade, barbeiro preferido e role de acesso.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-smoke">
          <div className="border-r border-line px-5 py-4">
            <p className="text-2xl font-semibold">{loadedClients.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Perfis</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-2xl font-semibold">{admins}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Admins</p>
          </div>
        </div>
      </div>

      <ClientManager initialClients={loadedClients as never} barbers={(barbers ?? []) as never} />
    </main>
  );
}

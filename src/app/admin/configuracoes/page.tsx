import { SettingsManager } from "@/components/admin/settings-manager";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">Configuracoes</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Regras da barbearia.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Ajuste antecedencia, intervalos, contato e limites operacionais sem tocar no banco manualmente.
        </p>
      </div>

      {data ? <SettingsManager settings={data as never} /> : null}
    </main>
  );
}

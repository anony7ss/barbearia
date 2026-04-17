import { redirect } from "next/navigation";
import { BarberAgendaManager } from "@/components/barber/barber-agenda-manager";
import { ApiError } from "@/lib/server/api";
import { requireBarber } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function BarberDashboardPage() {
  const auth = await requireBarber().catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent("/barbeiro")}`);
    }

    return null;
  });

  if (!auth) {
    redirect("/");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const windowStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data } = await auth.supabase
    .from("appointments")
    .select("id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,notes,internal_notes,services(name,duration_minutes),barbers(name)")
    .eq("barber_id", auth.barber.id)
    .gte("starts_at", windowStart.toISOString())
    .lt("starts_at", windowEnd.toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);

  return (
    <BarberAgendaManager
      barberName={auth.barber.name}
      appointments={(data ?? []) as never}
      todayStart={todayStart.toISOString()}
    />
  );
}

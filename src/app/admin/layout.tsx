import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login?redirect=/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}

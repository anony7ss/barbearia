import type { PropsWithChildren } from "react";
import { Footer } from "@/components/site/footer";
import { MobileBookingCTA } from "@/components/site/mobile-booking-cta";
import { Navbar } from "@/components/site/navbar";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function PublicShell({ children }: PropsWithChildren) {
  let isAuthenticated = false;
  let isAdmin = false;
  let userName: string | null = null;
  let userEmail: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    isAuthenticated = Boolean(user);
    userEmail = user?.email ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, is_active, deleted_at")
        .eq("id", user.id)
        .maybeSingle();

      isAdmin = profile?.role === "admin" && profile.is_active === true && profile.deleted_at === null;
      userName = profile?.full_name ?? user.user_metadata.full_name ?? null;
    }
  } catch {
    isAuthenticated = false;
    isAdmin = false;
  }

  return (
    <>
      <Navbar
        initialIsAuthenticated={isAuthenticated}
        initialIsAdmin={isAdmin}
        initialUserName={userName}
        initialUserEmail={userEmail}
      />
      <main>{children}</main>
      <Footer />
      <MobileBookingCTA />
    </>
  );
}

import { cookies } from "next/headers";
import type { PropsWithChildren } from "react";
import { Footer } from "@/components/site/footer";
import { MobileBookingCTA } from "@/components/site/mobile-booking-cta";
import { Navbar, type NavbarProps } from "@/components/site/navbar";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

type PublicShellProps = PropsWithChildren<{
  navbarProps?: NavbarProps;
}>;

export async function PublicShell({ children, navbarProps }: PublicShellProps) {
  let resolvedNavbarProps = navbarProps;

  if (!resolvedNavbarProps) {
    const cookieStore = await cookies();
    const hasSupabaseSessionCookie = cookieStore
      .getAll()
      .some((cookie) => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));

    if (hasSupabaseSessionCookie) {
      try {
        const supabase = await createSupabaseServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name, is_active, deleted_at")
            .eq("id", user.id)
            .maybeSingle();

          resolvedNavbarProps = {
            initialIsAuthenticated: true,
            initialIsAdmin:
              profile?.role === "admin" &&
              profile?.is_active === true &&
              profile?.deleted_at === null,
            initialIsBarber:
              profile?.role === "barber" &&
              profile?.is_active === true &&
              profile?.deleted_at === null,
            initialUserName: profile?.full_name ?? user.user_metadata.full_name ?? null,
            initialUserEmail: user.email ?? null,
          };
        }
      } catch {}
    }
  }

  return (
    <>
      <Navbar {...resolvedNavbarProps} />
      <main>{children}</main>
      <Footer />
      <MobileBookingCTA />
    </>
  );
}

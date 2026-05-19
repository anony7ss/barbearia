import type { PropsWithChildren } from "react";
import { Footer } from "@/components/site/footer";
import { MobileBookingCTA } from "@/components/site/mobile-booking-cta";
import { Navbar, type NavbarProps } from "@/components/site/navbar";

type PublicShellProps = PropsWithChildren<{
  navbarProps?: NavbarProps;
}>;

export function PublicShell({ children, navbarProps }: PublicShellProps) {
  return (
    <>
      <Navbar {...navbarProps} />
      <main>{children}</main>
      <Footer />
      <MobileBookingCTA />
    </>
  );
}

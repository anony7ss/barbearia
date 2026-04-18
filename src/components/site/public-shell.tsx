import type { PropsWithChildren } from "react";
import { Footer } from "@/components/site/footer";
import { MobileBookingCTA } from "@/components/site/mobile-booking-cta";
import { Navbar } from "@/components/site/navbar";

export function PublicShell({ children }: PropsWithChildren) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <MobileBookingCTA />
    </>
  );
}

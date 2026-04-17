import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/booking-flow";
import { LoadingState } from "@/components/ui/state";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Agendamento",
  description: "Agende corte, barba e servicos premium sem criar conta.",
};

export default function BookingPage() {
  return (
    <PublicShell>
      <section className="px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Agendamento
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Marque sem criar conta.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            O fluxo mostra apenas horarios validos e confirma com codigo para
            consulta rapida depois.
          </p>
        </div>
        <Suspense fallback={<LoadingState title="Preparando agenda" />}>
          <BookingFlow />
        </Suspense>
      </section>
    </PublicShell>
  );
}

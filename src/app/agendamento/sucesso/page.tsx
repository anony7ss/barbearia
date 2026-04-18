import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookingSuccess } from "@/components/booking/booking-success";
import { PublicShell } from "@/components/site/public-shell";

export const metadata: Metadata = {
  title: "Agendamento confirmado",
  description: "Confirmacao do seu agendamento na Corte Nobre.",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; code?: string }>;
}) {
  const params = await searchParams;
  if (params.id && params.token) {
    const code = params.code ? `&code=${encodeURIComponent(params.code)}` : "";
    redirect(
      `/api/booking/access?appointmentId=${params.id}` +
        `&token=${encodeURIComponent(params.token)}` +
        `&next=${encodeURIComponent("/agendamento/sucesso")}` +
        code,
    );
  }

  return (
    <PublicShell>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <BookingSuccess
          appointmentId={params.id}
          code={params.code}
        />
      </main>
    </PublicShell>
  );
}

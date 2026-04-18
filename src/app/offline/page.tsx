import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Phone, WifiOff } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { brand } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Offline",
  description: "Pagina offline da Corte Nobre Barbearia.",
};

export default function OfflinePage() {
  return (
    <main className="min-h-svh bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-4xl flex-col justify-between">
        <Link
          href="/"
          className="glass-line inline-flex w-fit items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold"
          aria-label="Corte Nobre - pagina inicial"
        >
          <BrandMark compact />
          <span className="tracking-[0.22em]">CORTE NOBRE</span>
        </Link>

        <section className="py-16">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-line bg-smoke text-brass">
            <WifiOff size={24} aria-hidden="true" />
          </span>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-brass">
            Sem conexao
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-6xl">
            Voce esta offline.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
            A agenda precisa de internet para mostrar horarios reais. Assim que a
            conexao voltar, voce pode consultar, remarcar ou confirmar seu horario.
          </p>

          <div className="mt-8 grid gap-3 sm:flex">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68]"
            >
              <CalendarCheck size={18} aria-hidden="true" />
              Tentar novamente
            </Link>
            <a
              href={`tel:${brand.phone.replace(/\D/g, "")}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-white/8 px-5 text-sm font-semibold text-foreground transition hover:border-brass/70 hover:bg-white/12"
            >
              <Phone size={18} aria-hidden="true" />
              Ligar para a barbearia
            </a>
          </div>
        </section>

        <p className="text-sm text-muted">
          {brand.phone} · {brand.hours[0]}
        </p>
      </div>
    </main>
  );
}

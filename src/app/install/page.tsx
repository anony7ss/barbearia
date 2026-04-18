import type { Metadata } from "next";
import { CalendarClock, ShieldCheck, WifiOff } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { InstallAppPanel } from "@/components/pwa/install-app-panel";

export const metadata: Metadata = {
  title: "Instalar app",
  description:
    "Instale a Corte Nobre no celular para acessar agendamento e consultas com mais rapidez.",
};

const benefits = [
  {
    icon: CalendarClock,
    title: "Agenda mais rapida",
    text: "Abra direto no fluxo de agendamento, sem procurar o site no historico.",
  },
  {
    icon: WifiOff,
    title: "Tela offline",
    text: "Se a internet cair, o app mostra uma tela segura com contato e orientacao.",
  },
  {
    icon: ShieldCheck,
    title: "Sem dados sensiveis em cache",
    text: "Informacoes de conta, admin e agendamentos nao ficam salvas no service worker.",
  },
];

export default function InstallPage() {
  return (
    <PublicShell>
      <main className="bg-background">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-36 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
                Instalar app
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-7xl">
                Corte Nobre na tela inicial.
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Uma versao instalavel do site, focada em acesso rapido pelo
              celular. Nao substitui a validacao online da agenda e nao guarda
              dados sensiveis localmente.
            </p>
          </div>

          <div className="mt-12">
            <InstallAppPanel />
          </div>
        </section>

        <section className="border-y border-line bg-smoke/55 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-[1.5rem] border border-line bg-background/60 p-5">
                <benefit.icon className="text-brass" size={22} aria-hidden="true" />
                <h2 className="mt-5 text-xl font-semibold">{benefit.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

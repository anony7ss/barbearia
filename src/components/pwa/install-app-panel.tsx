"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && window.navigator.standalone === true)
  );
}

function getPlatform() {
  if (typeof navigator === "undefined") return "desktop";

  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
}

export function InstallAppPanel() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [status, setStatus] = useState<"idle" | "accepted" | "dismissed">("idle");
  const platform = useMemo(() => getPlatform(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setStatus("accepted");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setStatus(choice.outcome);
    setInstallPrompt(null);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-line bg-smoke p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brass text-ink">
            <MonitorSmartphone size={22} aria-hidden="true" />
          </span>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
              installed
                ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                : "border-brass/35 bg-brass/10 text-brass",
            )}
          >
            {installed ? "Instalado" : "PWA"}
          </span>
        </div>

        <h2 className="mt-8 text-3xl font-semibold tracking-[-0.03em]">
          Acesse a Corte Nobre como app.
        </h2>
        <p className="mt-4 text-sm leading-6 text-muted">
          Instale o atalho no celular para abrir direto na agenda, consultar
          horarios e remarcar sem procurar o site no navegador.
        </p>

        <button
          type="button"
          onClick={installApp}
          disabled={!installPrompt || installed}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted sm:w-auto sm:min-w-56"
        >
          <Download size={18} aria-hidden="true" />
          {installed ? "App instalado" : installPrompt ? "Instalar agora" : "Instalar pelo navegador"}
        </button>

        <p className="mt-4 text-xs leading-5 text-muted">
          {status === "dismissed"
            ? "Instalacao cancelada. Voce ainda pode usar o menu do navegador para instalar depois."
            : "Se o botao estiver desativado, use o menu do navegador. Alguns aparelhos so mostram o prompt depois de navegar por algumas paginas."}
        </p>
      </section>

      <section className="rounded-[2rem] border border-line bg-background/60 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
          Como instalar
        </p>

        <div className="mt-6 grid gap-3">
          <InstallStep
            active={platform === "android"}
            title="Android / Chrome"
            text="Toque no menu do navegador e escolha Instalar app ou Adicionar a tela inicial."
          />
          <InstallStep
            active={platform === "ios"}
            title="iPhone / Safari"
            text="Toque em Compartilhar e depois em Adicionar a Tela de Inicio."
          />
          <InstallStep
            active={platform === "desktop"}
            title="Desktop"
            text="No Chrome ou Edge, use o icone de instalar na barra de endereco ou o menu do navegador."
          />
        </div>

        <div className="mt-7 rounded-2xl border border-line bg-smoke/70 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-brass" size={18} aria-hidden="true" />
            <div>
              <p className="font-semibold">Cache seguro</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                O app salva apenas arquivos publicos e a tela offline. Admin,
                agendamentos, APIs, sessoes e dados de cliente continuam sempre
                protegidos e buscados online.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InstallStep({
  active,
  title,
  text,
}: {
  active: boolean;
  title: string;
  text: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition",
        active ? "border-brass/45 bg-brass/10" : "border-line bg-smoke/55",
      )}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className={cn("mt-0.5 shrink-0", active ? "text-brass" : "text-muted")}
          size={18}
          aria-hidden="true"
        />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
        </div>
      </div>
    </article>
  );
}

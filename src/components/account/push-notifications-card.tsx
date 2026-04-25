"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BellRing, CheckCircle2, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserSupport = {
  eligible: boolean;
  deviceKind: "mobile" | "tablet" | "desktop";
  isIos: boolean;
  isStandalone: boolean;
  isSupported: boolean;
};

type ApiState = {
  enabled: boolean;
  activeSubscriptionCount: number;
  configured: boolean;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && window.navigator.standalone === true)
  );
}

function detectDeviceKind(): BrowserSupport["deviceKind"] {
  if (typeof navigator === "undefined") return "desktop";

  const userAgent = navigator.userAgent.toLowerCase();
  const isIpad =
    /ipad/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIpad || /tablet|playbook|silk|kindle/.test(userAgent)) return "tablet";
  if (/android/.test(userAgent) && !/mobile/.test(userAgent)) return "tablet";
  if (/iphone|ipod|android|mobile/.test(userAgent)) return "mobile";
  return "desktop";
}

function detectSupport(): BrowserSupport {
  const deviceKind = detectDeviceKind();
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const supported =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  return {
    eligible: supported && deviceKind !== "desktop",
    deviceKind,
    isIos,
    isStandalone: isStandaloneDisplay(),
    isSupported: supported,
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationsCard() {
  const [support, setSupport] = useState<BrowserSupport | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [apiState, setApiState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const shouldRender = useMemo(() => support?.deviceKind !== "desktop", [support]);

  useEffect(() => {
    const browserSupport = detectSupport();
    setSupport(browserSupport);
    setPermission(browserSupport.isSupported ? Notification.permission : "unsupported");

    if (!browserSupport.eligible || !publicKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function syncState() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        const response = await fetch("/api/account/push-subscriptions", { cache: "no-store" });
        const payload = (await response.json()) as ApiState & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel carregar o status.");
        }

        if (cancelled) return;

        setSubscribed(Boolean(existingSubscription));
        setApiState(payload);

        if (existingSubscription && (!payload.enabled || payload.activeSubscriptionCount === 0)) {
          await persistSubscription(existingSubscription, browserSupport.deviceKind);
          if (cancelled) return;
          setSubscribed(true);
          setApiState({
            ...payload,
            enabled: true,
            activeSubscriptionCount: Math.max(payload.activeSubscriptionCount, 1),
          });
        }
      } catch {
        if (!cancelled) {
          setMessage("Nao foi possivel verificar o estado das notificacoes.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void syncState();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  if (!support || !shouldRender) {
    return null;
  }

  if (!publicKey) {
    return null;
  }

  const currentSupport = support;
  const installedRequired = currentSupport.isIos && !currentSupport.isStandalone;
  const active = subscribed && (apiState?.enabled ?? false);
  const fullyConfigured = apiState?.configured ?? false;

  async function persistSubscription(
    subscription: PushSubscription,
    deviceKind: "mobile" | "tablet" | "desktop",
  ) {
    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error("Subscription invalida.");
    }

    const response = await fetch("/api/account/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
        deviceKind,
      }),
    });
    const payload = (await response.json()) as {
      enabled?: boolean;
      activeSubscriptionCount?: number;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Nao foi possivel salvar a notificacao.");
    }

    return payload;
  }

  async function enablePush() {
    if (!currentSupport.eligible || !publicKey || installedRequired) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        throw new Error(
          requestedPermission === "denied"
            ? "Permissao bloqueada no navegador."
            : "Permissao nao concedida.",
        );
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const payload = await persistSubscription(subscription, currentSupport.deviceKind);
      setSubscribed(true);
      setApiState((current) => ({
        enabled: true,
        activeSubscriptionCount: Math.max(payload.activeSubscriptionCount ?? current?.activeSubscriptionCount ?? 0, 1),
        configured: current?.configured ?? true,
      }));
      setMessage("Notificacoes ativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel ativar as notificacoes.");
    } finally {
      setSubmitting(false);
    }
  }

  async function disablePush() {
    if (!currentSupport.eligible) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setSubscribed(false);
        setApiState((current) => current ? { ...current, enabled: false, activeSubscriptionCount: 0 } : current);
        setMessage("Nenhuma subscription ativa neste dispositivo.");
        return;
      }

      const response = await fetch("/api/account/push-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const payload = (await response.json()) as {
        enabled?: boolean;
        activeSubscriptionCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel desativar as notificacoes.");
      }

      await subscription.unsubscribe().catch(() => undefined);
      setSubscribed(false);
      setApiState((current) => ({
        enabled: Boolean(payload.enabled),
        activeSubscriptionCount: payload.activeSubscriptionCount ?? (payload.enabled ? current?.activeSubscriptionCount ?? 1 : 0),
        configured: current?.configured ?? true,
      }));
      setMessage("Notificacoes desativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel desativar as notificacoes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-line bg-smoke p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brass text-ink">
            <BellRing size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
              Push no celular
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Lembretes operacionais no aparelho.
            </h2>
          </div>
        </div>

        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
            active
              ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
              : "border-line bg-background/60 text-muted",
          )}
        >
          {active ? "Ativo" : "Inativo"}
        </span>
      </div>

      <p className="mt-5 text-sm leading-6 text-muted">
        Use push apenas para lembretes de horario, reagendamentos e cancelamentos. Nada de campanhas ou mensagens fora da operacao.
      </p>

      {installedRequired ? (
        <div className="mt-5 rounded-2xl border border-brass/30 bg-background/70 p-4 text-sm leading-6 text-muted">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 shrink-0 text-brass" size={18} aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">No iPhone e iPad, instale o app primeiro.</p>
              <p className="mt-2">
                O Safari so libera push para o site instalado na tela inicial. Depois disso, volte aqui e ative as notificacoes.
              </p>
              <Link href="/install" className="mt-3 inline-flex text-sm font-semibold text-brass hover:text-foreground">
                Ver como instalar
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!currentSupport.isSupported ? (
        <div className="mt-5 rounded-2xl border border-line bg-background/65 p-4 text-sm leading-6 text-muted">
          Este navegador nao oferece suporte estavel a push notifications nesta configuracao.
        </div>
      ) : null}

      {currentSupport.isSupported && apiState && !fullyConfigured ? (
        <div className="mt-5 rounded-2xl border border-line bg-background/65 p-4 text-sm leading-6 text-muted">
          Push notifications ainda nao estao configuradas no servidor. Defina as chaves VAPID antes de ativar neste dispositivo.
        </div>
      ) : null}

      {permission === "denied" ? (
        <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div>
              <p className="font-semibold">Permissao bloqueada no navegador.</p>
              <p className="mt-2">
                Libere as notificacoes nas configuracoes do site para voltar a receber lembretes.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoCard
          title="O que voce recebe"
          text="24h antes, 2h antes, cancelamento e reagendamento do proprio horario."
          icon={<CheckCircle2 size={17} aria-hidden="true" />}
        />
        <InfoCard
          title="Privacidade"
          text="A subscription fica vinculada a sua conta e pode ser removida neste dispositivo a qualquer momento."
          icon={<ShieldCheck size={17} aria-hidden="true" />}
        />
      </div>

      {message ? (
        <p className="mt-5 text-sm leading-6 text-muted">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={enablePush}
          disabled={
            loading ||
            submitting ||
            installedRequired ||
            permission === "denied" ||
            active ||
            !currentSupport.isSupported ||
            !fullyConfigured
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
        >
          {submitting ? "Ativando..." : active ? "Push ativo neste aparelho" : "Ativar notificacoes"}
        </button>
        <button
          type="button"
          onClick={disablePush}
          disabled={loading || submitting || !subscribed}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-background/70 px-5 text-sm font-semibold text-foreground transition hover:border-brass/45 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Desativar neste dispositivo"}
        </button>
      </div>
    </section>
  );
}

function InfoCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-line bg-background/55 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-brass">{icon}</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
        </div>
      </div>
    </article>
  );
}

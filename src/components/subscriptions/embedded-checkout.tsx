"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";

const stripePromises = new Map<string, Promise<Stripe | null>>();

export function EmbeddedSubscriptionCheckout({
  publishableKey,
}: {
  publishableKey: string | null;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return getStripePromise(publishableKey);
  }, [publishableKey]);

  const fetchClientSecret = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/subscriptions/checkout-session", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as {
      clientSecret?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.clientSecret) {
      const message = payload?.error ?? "Nao foi possivel iniciar o checkout.";
      setStatus("error");
      setError(message);
      throw new Error(message);
    }

    setStatus("ready");
    return payload.clientSecret;
  }, [attempt]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  if (!publishableKey || !stripePromise) {
    return <CheckoutError message="Checkout Stripe nao configurado." onRetry={() => setAttempt((value) => value + 1)} />;
  }

  return (
    <div className="rounded-[1.75rem] border border-line bg-[#15120f] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
            Checkout seguro
          </p>
          <p className="mt-1 text-sm text-muted">Pagamento recorrente processado pela Stripe.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted">
          <CheckCircle2 size={14} aria-hidden="true" />
          teste
        </span>
      </div>

      {status === "loading" ? (
        <div className="grid min-h-[420px] place-items-center rounded-[1.25rem] border border-line bg-black/18 px-6 text-center">
          <div>
            <Loader2 className="mx-auto animate-spin text-brass" size={28} aria-hidden="true" />
            <p className="mt-4 font-semibold">Carregando checkout...</p>
            <p className="mt-2 text-sm text-muted">Isso pode levar alguns segundos no primeiro acesso.</p>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <CheckoutError message={error ?? "Erro ao carregar checkout."} onRetry={() => setAttempt((value) => value + 1)} />
      ) : null}

      <div className={status === "error" ? "hidden" : "min-h-[560px] overflow-hidden rounded-[1.25rem] bg-white"}>
        <EmbeddedCheckoutProvider key={attempt} stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

function CheckoutError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-[1.25rem] border border-line bg-black/18 px-6 text-center">
      <div>
        <AlertCircle className="mx-auto text-brass" size={30} aria-hidden="true" />
        <p className="mt-4 font-semibold">Checkout indisponivel</p>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition hover:border-brass/70 hover:bg-white/8"
        >
          <RefreshCcw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function getStripePromise(publishableKey: string) {
  const cached = stripePromises.get(publishableKey);
  if (cached) return cached;

  const stripePromise = loadStripe(publishableKey);
  stripePromises.set(publishableKey, stripePromise);
  return stripePromise;
}

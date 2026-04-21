"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import type { SubscriptionPlan, SubscriptionPlanId } from "@/features/subscriptions/plans";
import { cn, formatCurrency } from "@/lib/utils";

const stripePromises = new Map<string, Promise<Stripe | null>>();

export function SubscriptionCheckoutExperience({
  publishableKey,
  plans,
}: {
  publishableKey: string | null;
  plans: readonly SubscriptionPlan[];
}) {
  const defaultPlan = plans.find((plan) => plan.featured)?.id ?? plans[0]?.id ?? null;
  const [checkoutPlanId, setCheckoutPlanId] = useState<SubscriptionPlanId | null>(defaultPlan);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const checkoutPlan = plans.find((plan) => plan.id === checkoutPlanId) ?? null;

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return getStripePromise(publishableKey);
  }, [publishableKey]);

  const fetchClientSecret = useCallback(async () => {
    if (!checkoutPlanId) {
      throw new Error("Escolha um plano para continuar.");
    }

    setStatus("loading");
    setError(null);

    const response = await fetch("/api/subscriptions/checkout-session", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId: checkoutPlanId }),
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
  }, [checkoutPlanId]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = checkoutPlanId === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setCheckoutPlanId(plan.id);
                setStatus("loading");
                setError(null);
                setAttempt((value) => value + 1);
              }}
              className={cn(
                "group flex min-h-[430px] flex-col rounded-[1.75rem] border p-5 text-left transition duration-200",
                active
                  ? "border-brass/70 bg-brass/12 shadow-[0_28px_90px_rgba(193,150,85,0.12)]"
                  : "border-line bg-white/[0.035] hover:border-brass/45 hover:bg-white/[0.055]",
                plan.featured && !active && "border-brass/35",
              )}
              aria-pressed={active}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                    {plan.eyebrow}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                    {plan.name}
                  </h2>
                </div>
                <span className="rounded-full border border-line bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {plan.highlight}
                </span>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <p className="text-4xl font-semibold tracking-[-0.04em]">
                  {formatCurrency(plan.priceCents)}
                </p>
                <p className="pb-1 text-sm text-muted">/{plan.intervalLabel}</p>
              </div>
              <p className="mt-4 min-h-14 text-sm leading-6 text-muted">{plan.description}</p>

              <div className="mt-6 grid gap-3 border-t border-line pt-5">
                {plan.includes.map((item) => (
                  <span key={item} className="flex items-start gap-3 text-sm leading-5 text-muted">
                    <Check className="mt-0.5 shrink-0 text-brass" size={15} aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              <span
                className={cn(
                  "mt-auto inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition",
                  active
                    ? "bg-brass text-ink"
                    : "border border-line text-foreground group-hover:border-brass/60 group-hover:bg-white/8",
                )}
              >
                {active ? "Plano selecionado" : `Assinar ${plan.name}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[1.75rem] border border-line bg-[#15120f] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.28)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
              Checkout seguro
            </p>
            <p className="mt-1 text-sm text-muted">
              {checkoutPlan
                ? `${checkoutPlan.checkoutName} - ${formatCurrency(checkoutPlan.priceCents)}/${checkoutPlan.intervalLabel}`
                : "Escolha um plano para continuar."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted">
            <CheckCircle2 size={14} aria-hidden="true" />
            Stripe
          </span>
        </div>

        {!publishableKey || !stripePromise ? (
          <CheckoutError
            message="Checkout Stripe nao configurado."
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : null}

        {publishableKey && stripePromise && status === "loading" ? (
          <div className="grid min-h-[420px] place-items-center rounded-[1.25rem] border border-line bg-black/18 px-6 text-center">
            <div>
              <Loader2 className="mx-auto animate-spin text-brass" size={28} aria-hidden="true" />
              <p className="mt-4 font-semibold">Carregando checkout...</p>
              <p className="mt-2 text-sm text-muted">Preparando pagamento do plano selecionado.</p>
            </div>
          </div>
        ) : null}

        {publishableKey && stripePromise && status === "error" ? (
          <CheckoutError
            message={error ?? "Erro ao carregar checkout."}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : null}

        {publishableKey && stripePromise ? (
          <div
            className={cn(
              "min-h-[560px] overflow-hidden rounded-[1.25rem] bg-white",
              status === "error" && "hidden",
            )}
          >
            <EmbeddedCheckoutProvider
              key={`${checkoutPlanId ?? "none"}-${attempt}`}
              stripe={stripePromise}
              options={options}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : null}
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

import "server-only";

import Stripe from "stripe";
import { getSubscriptionPlan, type SubscriptionPlanId } from "@/features/subscriptions/plans";
import { ApiError } from "@/lib/server/api";

export const stripeApiVersion = "2026-03-25.dahlia";

let stripeClient: Stripe | null = null;

type CreateEmbeddedSubscriptionSessionInput = {
  origin: string;
  planId: SubscriptionPlanId;
  userId?: string | null;
  userEmail?: string | null;
};

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export async function createEmbeddedSubscriptionSession({
  origin,
  planId,
  userId,
  userEmail,
}: CreateEmbeddedSubscriptionSessionInput) {
  const siteUrl = getSiteUrl(origin);
  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    throw new ApiError(400, "Plano invalido.");
  }

  const priceId = planPriceId(plan);
  const metadata = {
    plan: plan.id,
    plan_name: plan.name,
    ...(userId ? { user_id: userId } : {}),
  };

  const session = await getStripeClient().checkout.sessions.create({
    mode: "subscription",
    ui_mode: "embedded_page",
    return_url: `${siteUrl}/assinaturas/retorno?session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: userId ?? undefined,
    customer_email: userEmail ?? undefined,
    metadata,
    subscription_data: { metadata },
    line_items: [
      priceId
        ? {
            price: priceId,
            quantity: 1,
          }
        : {
            price_data: {
              currency: subscriptionCurrency(),
              ...productConfig(plan),
              recurring: { interval: "month" },
              unit_amount: planAmountCents(plan),
            },
            quantity: 1,
          },
    ],
  });

  if (!session.client_secret) {
    throw new ApiError(502, "Nao foi possivel iniciar o checkout.");
  }

  return {
    id: session.id,
    clientSecret: session.client_secret,
  };
}

export async function retrieveCheckoutSession(sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw new ApiError(400, "Sessao invalida.");
  }

  return getStripeClient().checkout.sessions.retrieve(sessionId);
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(500, "Stripe nao configurado.");
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: stripeApiVersion,
  });

  return stripeClient;
}

function getSiteUrl(origin: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
}

function planPriceId(plan: { id: string; envKey: string }) {
  const specificPriceId = process.env[`STRIPE_SUBSCRIPTION_PRICE_${plan.envKey}`]?.trim();
  const legacyPrimePriceId = plan.id === "prime" ? process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim() : undefined;
  const priceId = specificPriceId || legacyPrimePriceId;

  if (!priceId) return null;
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
    throw new ApiError(500, "Price Stripe invalido.");
  }
  return priceId;
}

function planAmountCents(plan: { envKey: string; priceCents: number }) {
  const override = process.env[`STRIPE_SUBSCRIPTION_AMOUNT_${plan.envKey}_CENTS`];
  const amount = Number(override ?? plan.priceCents);
  if (!Number.isInteger(amount) || amount < 100) {
    throw new ApiError(500, "Valor da assinatura invalido.");
  }
  return amount;
}

function productConfig(plan: { id: string; checkoutName: string; checkoutDescription: string }) {
  const productId = process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID?.trim();
  if (productId) {
    if (!/^prod_[A-Za-z0-9]+$/.test(productId)) {
      throw new ApiError(500, "Produto Stripe invalido.");
    }
    return { product: productId };
  }

  return {
    product_data: {
      name: plan.checkoutName,
      description: plan.checkoutDescription,
      metadata: {
        plan: plan.id,
      },
    },
  };
}

function subscriptionCurrency() {
  const currency = (process.env.STRIPE_SUBSCRIPTION_CURRENCY ?? "brl").toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new ApiError(500, "Moeda Stripe invalida.");
  }
  return currency;
}

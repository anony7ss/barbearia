import { type NextRequest } from "next/server";
import { z } from "zod";
import type { SubscriptionPlanId } from "@/features/subscriptions/plans";
import { createEmbeddedSubscriptionSession } from "@/integrations/stripe/server";
import { getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const checkoutSessionSchema = z.object({
  planId: z.enum(["essencial", "prime", "black"]),
}).strict();

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "subscription_checkout", 5, 300);
    const body = await parseJson(request, checkoutSessionSchema);

    const { user } = await getAuthenticatedUser().catch(() => ({ user: null }));
    const session = await createEmbeddedSubscriptionSession({
      origin: request.nextUrl.origin,
      planId: body.planId as SubscriptionPlanId,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
    });

    return jsonOk({ clientSecret: session.clientSecret });
  } catch (error) {
    return jsonError(error);
  }
}

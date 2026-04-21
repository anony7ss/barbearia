import { type NextRequest } from "next/server";
import { createEmbeddedSubscriptionSession } from "@/integrations/stripe/server";
import { getClientFingerprint, jsonError, jsonOk } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "subscription_checkout", 5, 300);

    const { user } = await getAuthenticatedUser().catch(() => ({ user: null }));
    const session = await createEmbeddedSubscriptionSession({
      origin: request.nextUrl.origin,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
    });

    return jsonOk({ clientSecret: session.clientSecret });
  } catch (error) {
    return jsonError(error);
  }
}

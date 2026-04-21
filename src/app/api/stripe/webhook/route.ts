import { type NextRequest } from "next/server";
import { constructStripeWebhookEvent, retrieveCheckoutSession } from "@/integrations/stripe/server";
import { jsonError, jsonOk } from "@/lib/server/api";
import { syncAppointmentPaymentFromCheckoutSession } from "@/lib/server/appointment-payments";
import { logSecureEvent } from "@/lib/server/logging";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const event = constructStripeWebhookEvent(payload, request.headers.get("stripe-signature"));

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const object = event.data.object;
      const session = object.object === "checkout.session"
        ? object
        : await retrieveCheckoutSession(String(object.id));

      await syncAppointmentPaymentFromCheckoutSession(session);
    }

    return jsonOk({ received: true });
  } catch (error) {
    logSecureEvent({
      level: "warn",
      event: "stripe_webhook_failed",
      route: "/api/stripe/webhook",
    });
    return jsonError(error);
  }
}

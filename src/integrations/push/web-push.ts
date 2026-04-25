import "server-only";

import webpush from "web-push";

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let vapidConfigured = false;

export function isWebPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT,
  );
}

function getWebPushClient() {
  if (!isWebPushConfigured()) {
    throw new Error("Web push nao configurado.");
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.WEB_PUSH_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    vapidConfigured = true;
  }

  return webpush;
}

export async function sendWebPushNotification(
  subscription: PushSubscriptionPayload,
  payload: Record<string, string | boolean | null | undefined>,
) {
  const client = getWebPushClient();
  return client.sendNotification(subscription, JSON.stringify(payload));
}

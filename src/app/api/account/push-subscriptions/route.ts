import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(512),
  }).strict(),
  deviceKind: z.enum(["mobile", "tablet"]).default("mobile"),
}).strict();

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
}).strict();

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      throw new ApiError(401, "Autenticacao obrigatoria.");
    }

    const [{ data: preferences }, { count, error: subscriptionsError }] = await Promise.all([
      supabase
        .from("client_preferences")
        .select("push_booking_updates")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    return jsonOk({
      enabled: preferences?.push_booking_updates ?? false,
      activeSubscriptionCount: count ?? 0,
      configured:
        Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
        Boolean(process.env.VAPID_PRIVATE_KEY) &&
        Boolean(process.env.WEB_PUSH_SUBJECT),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      throw new ApiError(401, "Autenticacao obrigatoria.");
    }

    if (
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY ||
      !process.env.WEB_PUSH_SUBJECT
    ) {
      throw new ApiError(503, "Push notifications indisponiveis.");
    }

    const body = await parseJson(request, subscriptionSchema);
    const now = new Date().toISOString();
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

    const { error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: body.endpoint,
          p256dh_key: body.keys.p256dh,
          auth_key: body.keys.auth,
          device_kind: body.deviceKind,
          user_agent: userAgent,
          is_active: true,
          last_seen_at: now,
          last_error: null,
        },
        { onConflict: "endpoint" },
      );

    if (subscriptionError) {
      throw subscriptionError;
    }

    const { error: preferencesError } = await supabase
      .from("client_preferences")
      .upsert(
        {
          user_id: user.id,
          push_booking_updates: true,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );

    if (preferencesError) {
      throw preferencesError;
    }

    const { count, error: countError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (countError) {
      throw countError;
    }

    return jsonOk({ ok: true, enabled: true, activeSubscriptionCount: count ?? 0 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      throw new ApiError(401, "Autenticacao obrigatoria.");
    }

    const body = await parseJson(request, unsubscribeSchema);

    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", body.endpoint);

    if (deleteError) {
      throw deleteError;
    }

    const { count, error: countError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (countError) {
      throw countError;
    }

    const enabled = (count ?? 0) > 0;
    const { error: preferencesError } = await supabase
      .from("client_preferences")
      .upsert(
        {
          user_id: user.id,
          push_booking_updates: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (preferencesError) {
      throw preferencesError;
    }

    return jsonOk({ ok: true, enabled, activeSubscriptionCount: count ?? 0 });
  } catch (error) {
    return jsonError(error);
  }
}

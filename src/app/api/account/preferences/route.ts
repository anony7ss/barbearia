import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAuthenticatedUser } from "@/lib/server/auth";

const preferencesSchema = z.object({
  favoriteBarberId: z.string().uuid().optional().or(z.literal("")),
  favoriteServiceId: z.string().uuid().optional().or(z.literal("")),
  personalNotes: z.string().trim().max(500).optional().or(z.literal("")),
  marketingOptIn: z.coerce.boolean().default(false),
}).strict();

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      throw new ApiError(401, "Autenticacao obrigatoria.");
    }

    const body = await parseJson(request, preferencesSchema);
    const favoriteBarberId = body.favoriteBarberId || null;
    const favoriteServiceId = body.favoriteServiceId || null;
    const { error } = await supabase.from("client_preferences").upsert({
      user_id: user.id,
      favorite_barber_id: favoriteBarberId,
      favorite_service_id: favoriteServiceId,
      personal_notes: body.personalNotes || null,
      marketing_opt_in: body.marketingOptIn,
    });

    if (error) throw error;

    await supabase
      .from("profiles")
      .update({ preferred_barber_id: favoriteBarberId })
      .eq("id", user.id);

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

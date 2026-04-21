import { type NextRequest } from "next/server";
import { barberAdminSchema } from "@/features/admin/schemas";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.from("barbers").select("*").order("display_order");

    if (error) throw error;
    return jsonOk({ barbers: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, barberAdminSchema);
    const photoUrl = body.photo_url || null;
    const { data, error } = await supabase.from("barbers").insert({
      ...body,
      bio: body.bio || null,
      photo_url: photoUrl,
      photo_storage_path: null,
      profile_id: body.profile_id || null,
    }).select("*").single();

    if (error) throw error;
    return jsonOk({ barber: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

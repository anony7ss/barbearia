import { type NextRequest } from "next/server";
import { serviceAdminSchema } from "@/features/admin/schemas";
import { jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("display_order");

    if (error) throw error;
    return jsonOk({ services: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await parseJson(request, serviceAdminSchema);
    const { data, error } = await supabase.from("services").insert(body).select("*").single();

    if (error) throw error;
    return jsonOk({ service: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

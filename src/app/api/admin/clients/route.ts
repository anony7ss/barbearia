import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

const clientsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const parsedQuery = clientsQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    if (!parsedQuery.success) {
      throw new ApiError(400, "Filtros invalidos.");
    }

    const search = parsedQuery.data.q;
    let query = supabase
      .from("profiles")
      .select("id,full_name,phone,role,loyalty_points,preferred_barber_id,internal_notes,is_active,deleted_at,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return jsonOk({ clients: data });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { jsonError, jsonOk } from "@/lib/server/api";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    return jsonOk(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}


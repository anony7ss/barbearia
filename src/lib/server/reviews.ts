import "server-only";

import { getSupabaseAdminClient } from "@/integrations/supabase/admin";

export type PublicReviewTestimonial = {
  quote: string;
  author: string;
  detail: string;
  rating: number;
};

type ReviewRow = {
  rating: number;
  comment: string;
  customer_name: string;
  services?: { name: string } | null;
  barbers?: { name: string } | null;
};

export async function getPublicReviewTestimonials(limit = 12): Promise<PublicReviewTestimonial[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("appointment_reviews")
      .select("rating,comment,customer_name,services(name),barbers(name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];

    return ((data ?? []) as unknown as ReviewRow[]).map((review) => ({
      quote: review.comment,
      author: review.customer_name,
      detail: [review.services?.name, review.barbers?.name].filter(Boolean).join(" com ") || "cliente verificado",
      rating: review.rating,
    }));
  } catch {
    return [];
  }
}

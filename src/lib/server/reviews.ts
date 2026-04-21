import "server-only";

import { getSupabaseAdminClient } from "@/integrations/supabase/admin";

export type PublicReviewTestimonial = {
  quote: string;
  author: string;
  detail: string;
  rating: number;
  serviceName: string | null;
  barberName: string | null;
  createdAt: string | null;
};

type ReviewRow = {
  rating: number;
  comment: string;
  customer_name: string;
  created_at?: string | null;
  services?: { name: string } | null;
  barbers?: { name: string } | null;
};

export async function getPublicReviewTestimonials(limit = 12): Promise<PublicReviewTestimonial[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("appointment_reviews")
      .select("rating,comment,customer_name,created_at,services(name),barbers(name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];

    return ((data ?? []) as unknown as ReviewRow[]).map(toPublicReview);
  } catch {
    return [];
  }
}

export async function getPublicReviewsForBarber(
  barberId: string,
  limit = 9,
): Promise<PublicReviewTestimonial[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("appointment_reviews")
      .select("rating,comment,customer_name,created_at,services(name),barbers(name)")
      .eq("barber_id", barberId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return ((data ?? []) as unknown as ReviewRow[]).map(toPublicReview);
  } catch {
    return [];
  }
}

function toPublicReview(review: ReviewRow): PublicReviewTestimonial {
  const serviceName = review.services?.name ?? null;
  const barberName = review.barbers?.name ?? null;

  return {
    quote: review.comment,
    author: review.customer_name,
    detail: [serviceName, barberName].filter(Boolean).join(" com ") || "cliente verificado",
    rating: review.rating,
    serviceName,
    barberName,
    createdAt: review.created_at ?? null,
  };
}

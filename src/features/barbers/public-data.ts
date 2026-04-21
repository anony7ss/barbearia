import "server-only";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { resolveGalleryItemImageUrl, toBarberGalleryItem } from "@/features/barbers/gallery-config";

type BarberRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  photo_url: string | null;
  rating: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
};

type GalleryQueryRow = {
  id: string;
  barber_id: string;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  is_cover: boolean;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  barbers?: { name?: string; slug?: string } | null;
};

export type PublicBarber = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  specialties: string[];
  photoUrl: string | null;
  rating: string;
  numericRating: number;
  isFeatured: boolean;
  badge: string;
  roleLabel: string;
};

export type PublicGalleryAsset = {
  id: string;
  imageUrl: string;
  altText: string;
  caption: string | null;
  barberName: string | null;
  barberSlug: string | null;
  isCover: boolean;
};

export async function getPublicBarbers(limit?: number) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("barbers")
    .select("id,name,slug,bio,specialties,photo_url,rating,is_featured,is_active,display_order")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toPublicBarber);
}

export async function getPublicBarberBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("id,name,slug,bio,specialties,photo_url,rating,is_featured,is_active,display_order")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data ? toPublicBarber(data) : null;
}

export async function getPublicGalleryFeed(limit = 4) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id,barber_id,storage_path,external_url,alt_text,caption,sort_order,is_cover,is_active,uploaded_by,created_at,updated_at,barbers(name,slug)")
    .eq("is_active", true)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? [])
    .map((row) => toPublicGalleryAsset(row as never))
    .filter((item): item is PublicGalleryAsset => Boolean(item));
}

export async function getPublicGalleryForBarber(barberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id,barber_id,storage_path,external_url,alt_text,caption,sort_order,is_cover,is_active,uploaded_by,created_at,updated_at")
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const item = toBarberGalleryItem(row);
      if (!item.imageUrl) return null;
      return {
        id: item.id,
        imageUrl: item.imageUrl,
        altText: item.altText ?? `Portfolio de barbeiro`,
        caption: item.caption,
        barberName: null,
        barberSlug: null,
        isCover: item.isCover,
      } satisfies PublicGalleryAsset;
    })
    .filter((item): item is PublicGalleryAsset => Boolean(item));
}

function toPublicBarber(row: BarberRow): PublicBarber {
  const primarySpecialty = row.specialties[0]?.trim();

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio?.trim() || "Atendimento premium, leitura de estilo e acabamento preciso.",
    specialties: row.specialties,
    photoUrl: row.photo_url,
    rating: Number(row.rating).toFixed(2),
    numericRating: Number(row.rating),
    isFeatured: row.is_featured,
    badge: row.is_featured ? "Destaque" : primarySpecialty || "Equipe",
    roleLabel: primarySpecialty ? `Especialista em ${primarySpecialty.toLowerCase()}` : "Barbeiro da casa",
  };
}

function toPublicGalleryAsset(row: GalleryQueryRow) {
  const imageUrl = resolveGalleryItemImageUrl(row);
  if (!imageUrl) return null;

  return {
    id: row.id,
    imageUrl,
    altText: row.alt_text ?? row.caption ?? "Galeria da barbearia",
    caption: row.caption,
    barberName: row.barbers?.name ?? null,
    barberSlug: row.barbers?.slug ?? null,
    isCover: row.is_cover,
  } satisfies PublicGalleryAsset;
}

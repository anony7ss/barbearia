import type { Database } from "@/types/database";

export const GALLERY_BUCKET = "barbershop-gallery";
export const MAX_GALLERY_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_GALLERY_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type GalleryItemRow = Database["public"]["Tables"]["gallery_items"]["Row"];

export type BarberGalleryItem = {
  id: string;
  barberId: string;
  imageUrl: string;
  storagePath: string | null;
  externalUrl: string | null;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
  isActive: boolean;
  createdAt: string;
};

export function buildStoragePublicUrl(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente.");
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${GALLERY_BUCKET}/${normalizedPath}`;
}

export function resolveGalleryItemImageUrl(item: Pick<GalleryItemRow, "storage_path" | "external_url">) {
  if (item.external_url) return item.external_url;
  if (!item.storage_path) return null;
  return buildStoragePublicUrl(item.storage_path);
}

export function toBarberGalleryItem(row: GalleryItemRow): BarberGalleryItem {
  return {
    id: row.id,
    barberId: row.barber_id,
    imageUrl: resolveGalleryItemImageUrl(row) ?? "",
    storagePath: row.storage_path,
    externalUrl: row.external_url,
    altText: row.alt_text,
    caption: row.caption,
    sortOrder: row.sort_order,
    isCover: row.is_cover,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

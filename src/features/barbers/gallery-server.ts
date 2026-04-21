import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database";
import { ApiError } from "@/lib/server/api";
import { ALLOWED_GALLERY_MIME_TYPES, GALLERY_BUCKET, MAX_GALLERY_IMAGE_BYTES, toBarberGalleryItem } from "@/features/barbers/gallery-config";

const externalImageUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Use uma URL HTTPS.")
  .max(1000);

export const galleryItemUpdatePayloadSchema = z.object({
  altText: z.string().trim().min(2).max(180).optional().nullable().or(z.literal("")),
  caption: z.string().trim().max(240).optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
  isCover: z.boolean().optional(),
}).strict();

export const gallerySortPayloadSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
}).strict();

export type GalleryUpdateInput = z.infer<typeof galleryItemUpdatePayloadSchema>;
export type GallerySortInput = z.infer<typeof gallerySortPayloadSchema>;

type UploadMode = "gallery" | "portrait";

export async function listGalleryItems(
  supabase: SupabaseClient<Database>,
  barberId: string,
) {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("barber_id", barberId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toBarberGalleryItem);
}

export async function uploadGalleryItemFromForm({
  supabase,
  barberId,
  actorId,
  formData,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
  actorId: string;
  formData: FormData;
}) {
  const input = await parseImageInput(formData, { fileField: "file", urlField: "external_url", required: true });
  const altText = normalizeOptionalText(formData.get("alt_text"), 180);
  const caption = normalizeOptionalText(formData.get("caption"), 240);
  const isCover = formData.get("is_cover") === "true";

  const sortOrder = await nextSortOrder(supabase, barberId);

  let rowInput: Database["public"]["Tables"]["gallery_items"]["Insert"] = {
    barber_id: barberId,
    alt_text: altText,
    caption,
    sort_order: sortOrder,
    is_cover: isCover,
    is_active: true,
    uploaded_by: actorId,
  };

  if (input.kind === "url") {
    rowInput = { ...rowInput, external_url: input.url };
  } else {
    const storagePath = buildStoragePath(barberId, "gallery", input.extension);
    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;
    rowInput = { ...rowInput, storage_path: storagePath };
  }

  if (isCover) {
    await supabase.from("gallery_items").update({ is_cover: false }).eq("barber_id", barberId).eq("is_cover", true);
  }

  const { data, error } = await supabase.from("gallery_items").insert(rowInput).select("*").single();
  if (error) throw error;
  return toBarberGalleryItem(data);
}

export async function updateGalleryItem({
  supabase,
  barberId,
  itemId,
  input,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
  itemId: string;
  input: unknown;
}) {
  const body = galleryItemUpdatePayloadSchema.parse(input);

  if (body.isCover) {
    await supabase.from("gallery_items").update({ is_cover: false }).eq("barber_id", barberId).eq("is_cover", true);
  }

  const update: Database["public"]["Tables"]["gallery_items"]["Update"] = {};
  if (body.altText !== undefined) update.alt_text = body.altText || null;
  if (body.caption !== undefined) update.caption = body.caption || null;
  if (body.isActive !== undefined) update.is_active = body.isActive;
  if (body.isCover !== undefined) update.is_cover = body.isCover;

  const { data, error } = await supabase
    .from("gallery_items")
    .update(update)
    .eq("id", itemId)
    .eq("barber_id", barberId)
    .select("*")
    .single();

  if (error) throw error;
  return toBarberGalleryItem(data);
}

export async function deleteGalleryItem({
  supabase,
  barberId,
  itemId,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
  itemId: string;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("gallery_items")
    .select("id,storage_path")
    .eq("id", itemId)
    .eq("barber_id", barberId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new ApiError(404, "Imagem nao encontrada.");
  }

  if (existing.storage_path) {
    await supabase.storage.from(GALLERY_BUCKET).remove([existing.storage_path]);
  }

  const { error } = await supabase.from("gallery_items").delete().eq("id", itemId).eq("barber_id", barberId);
  if (error) throw error;
}

export async function reorderGalleryItems({
  supabase,
  barberId,
  input,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
  input: unknown;
}) {
  const body = gallerySortPayloadSchema.parse(input);
  const itemIds = body.itemIds;

  const { data: existing, error: existingError } = await supabase
    .from("gallery_items")
    .select("id")
    .eq("barber_id", barberId);

  if (existingError) throw existingError;
  const existingIds = new Set((existing ?? []).map((item) => item.id));

  if (existingIds.size !== itemIds.length || itemIds.some((id) => !existingIds.has(id))) {
    throw new ApiError(400, "Ordem invalida.");
  }

  const updates = itemIds.map((id, index) =>
    supabase.from("gallery_items").update({ sort_order: index }).eq("id", id).eq("barber_id", barberId),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return listGalleryItems(supabase, barberId);
}

export async function uploadBarberPortrait({
  supabase,
  barberId,
  formData,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
  formData: FormData;
}) {
  const input = await parseImageInput(formData, { fileField: "file", urlField: "external_url", required: true });

  const { data: current, error: currentError } = await supabase
    .from("barbers")
    .select("id,photo_storage_path")
    .eq("id", barberId)
    .maybeSingle();

  if (currentError || !current) {
    throw new ApiError(404, "Barbeiro nao encontrado.");
  }

  let photoUrl: string | null = null;
  let photoStoragePath: string | null = null;

  if (input.kind === "url") {
    photoUrl = input.url;
  } else {
    const storagePath = buildStoragePath(barberId, "portrait", input.extension);
    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;
    photoStoragePath = storagePath;
    photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${GALLERY_BUCKET}/${storagePath}`;
  }

  if (current.photo_storage_path) {
    await supabase.storage.from(GALLERY_BUCKET).remove([current.photo_storage_path]);
  }

  const { data, error } = await supabase
    .from("barbers")
    .update({
      photo_url: photoUrl,
      photo_storage_path: photoStoragePath,
    })
    .eq("id", barberId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function clearBarberPortrait({
  supabase,
  barberId,
}: {
  supabase: SupabaseClient<Database>;
  barberId: string;
}) {
  const { data: current, error: currentError } = await supabase
    .from("barbers")
    .select("id,photo_storage_path")
    .eq("id", barberId)
    .maybeSingle();

  if (currentError || !current) {
    throw new ApiError(404, "Barbeiro nao encontrado.");
  }

  if (current.photo_storage_path) {
    await supabase.storage.from(GALLERY_BUCKET).remove([current.photo_storage_path]);
  }

  const { data, error } = await supabase
    .from("barbers")
    .update({ photo_url: null, photo_storage_path: null })
    .eq("id", barberId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function nextSortOrder(supabase: SupabaseClient<Database>, barberId: string) {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("sort_order")
    .eq("barber_id", barberId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? -1) + 1;
}

function normalizeOptionalText(value: FormDataEntryValue | null, maxLength: number) {
  const next = String(value ?? "").trim();
  if (!next) return null;
  if (next.length > maxLength) {
    throw new ApiError(400, "Texto muito longo.");
  }
  return next;
}

async function parseImageInput(
  formData: FormData,
  options: {
    fileField: string;
    urlField: string;
    required: boolean;
  },
): Promise<
  | { kind: "url"; url: string }
  | { kind: "upload"; file: File; extension: "jpg" | "png" | "webp"; mimeType: typeof ALLOWED_GALLERY_MIME_TYPES[number] }
> {
  const fileEntry = formData.get(options.fileField);
  const rawUrl = String(formData.get(options.urlField) ?? "").trim();
  const hasFile = fileEntry instanceof File && fileEntry.size > 0;
  const hasUrl = rawUrl.length > 0;

  if (hasFile && hasUrl) {
    throw new ApiError(400, "Envie um arquivo ou uma URL, nao os dois.");
  }

  if (!hasFile && !hasUrl) {
    if (options.required) {
      throw new ApiError(400, "Selecione uma imagem ou informe uma URL HTTPS.");
    }
    throw new ApiError(400, "Imagem ausente.");
  }

  if (hasUrl) {
    return { kind: "url", url: externalImageUrlSchema.parse(rawUrl) };
  }

  const file = fileEntry as File;
  if (file.size > MAX_GALLERY_IMAGE_BYTES) {
    throw new ApiError(413, "Arquivo muito grande.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);

  if (!detected) {
    throw new ApiError(400, "Formato de imagem invalido. Use JPG, PNG ou WebP.");
  }

  return {
    kind: "upload",
    file,
    extension: detected.extension,
    mimeType: detected.mimeType,
  };
}

function detectImageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg" as const, mimeType: "image/jpeg" as const };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png" as const, mimeType: "image/png" as const };
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp" as const, mimeType: "image/webp" as const };
  }

  return null;
}

function buildStoragePath(barberId: string, mode: UploadMode, extension: "jpg" | "png" | "webp") {
  return `barbers/${barberId}/${mode}/${Date.now()}-${randomUUID()}.${extension}`;
}

import "server-only";

import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { brand } from "@/lib/site-data";

type PublicBusinessSettingsRow = {
  whatsapp_phone: string | null;
  email: string | null;
  address: string | null;
  instagram_handle: string | null;
};

export type PublicSiteSettings = {
  phoneDisplay: string;
  phoneHref: string;
  whatsappUrl: string;
  email: string;
  address: string;
  mapUrl: string;
  instagramLabel: string;
  instagramUrl: string;
};

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("public_business_settings")
      .select("whatsapp_phone,email,address,instagram_handle")
      .maybeSingle<PublicBusinessSettingsRow>();

    return buildPublicSiteSettings(data);
  } catch {
    return buildPublicSiteSettings(null);
  }
}

function buildPublicSiteSettings(data: PublicBusinessSettingsRow | null): PublicSiteSettings {
  const phoneDigits =
    normalizePhone(data?.whatsapp_phone) ||
    normalizePhone(brand.whatsapp) ||
    normalizePhone(brand.phone);
  const instagramHandle =
    normalizeInstagramHandle(data?.instagram_handle) ||
    normalizeInstagramHandle(brand.instagramHandle);
  const email = data?.email?.trim() || brand.email;
  const address = data?.address?.trim() || brand.address;

  return {
    phoneDisplay: formatPhoneDisplay(phoneDigits) || brand.phone,
    phoneHref: formatPhoneHref(phoneDigits) || brand.phone,
    whatsappUrl: buildWhatsAppUrl(phoneDigits),
    email,
    address,
    mapUrl: buildGoogleMapsUrl(address) || brand.mapUrl,
    instagramLabel: instagramHandle ? `@${instagramHandle}` : "@instagram",
    instagramUrl: instagramHandle
      ? `https://instagram.com/${instagramHandle}`
      : "https://instagram.com",
  };
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function normalizeInstagramHandle(value: string | null | undefined) {
  return value?.trim().replace(/^@+/, "") ?? "";
}

function formatPhoneHref(phoneDigits: string) {
  if (!phoneDigits) return "";
  return `+${phoneDigits}`;
}

function formatPhoneDisplay(phoneDigits: string) {
  if (!phoneDigits) return "";

  if (phoneDigits.length === 13 && phoneDigits.startsWith("55")) {
    return `+${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4, 9)}-${phoneDigits.slice(9)}`;
  }

  if (phoneDigits.length === 12 && phoneDigits.startsWith("55")) {
    return `+${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4, 8)}-${phoneDigits.slice(8)}`;
  }

  if (phoneDigits.length === 11) {
    return `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 7)}-${phoneDigits.slice(7)}`;
  }

  if (phoneDigits.length === 10) {
    return `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 6)}-${phoneDigits.slice(6)}`;
  }

  return phoneDigits;
}

function buildWhatsAppUrl(phoneDigits: string) {
  if (!phoneDigits) {
    return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent("Ola, quero falar com a Corte Nobre.")}`;
  }

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent("Ola, quero falar com a Corte Nobre.")}`;
}

function buildGoogleMapsUrl(address: string) {
  const normalized = address.trim();
  if (!normalized) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`;
}

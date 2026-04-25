import { z } from "zod";

const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Use uma URL HTTPS.");

const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(8).max(24));

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value === "" || (value.length >= 8 && value.length <= 24), "Telefone invalido.");

const optionalInstagramHandleSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, ""))
  .refine(
    (value) => value === "" || /^[A-Za-z0-9._]{1,30}$/.test(value),
    "Instagram invalido.",
  );

export const serviceAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(8).max(500),
  duration_minutes: z.coerce.number().int().min(10).max(240),
  buffer_minutes: z.coerce.number().int().min(0).max(60).default(0),
  price_cents: z.coerce.number().int().min(0).max(1000000),
  is_active: z.coerce.boolean().default(true),
  display_order: z.coerce.number().int().min(0).default(0),
}).strict();

export const barberAdminSchema = z.object({
  profile_id: z.string().uuid().optional().nullable().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  specialties: z.array(z.string().trim().min(1).max(60)).default([]),
  photo_url: httpsUrlSchema.optional().or(z.literal("")),
  is_featured: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(true),
  display_order: z.coerce.number().int().min(0).default(0),
}).strict();

export const businessSettingsAdminSchema = z.object({
  business_name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).max(80),
  min_notice_minutes: z.coerce.number().int().min(0).max(10080),
  max_advance_days: z.coerce.number().int().min(1).max(180),
  cancellation_limit_minutes: z.coerce.number().int().min(0).max(10080),
  reschedule_limit_minutes: z.coerce.number().int().min(0).max(10080),
  slot_interval_minutes: z.coerce.number().int().refine((value) => [10, 15, 20, 30, 60].includes(value)),
  default_buffer_minutes: z.coerce.number().int().min(0).max(60),
  whatsapp_phone: optionalPhoneSchema.optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  instagram_handle: optionalInstagramHandleSchema.optional().or(z.literal("")),
}).strict();

export const appointmentAdminSchema = z.object({
  service_id: z.string().uuid(),
  barber_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).default("confirmed"),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().optional().or(z.literal("")),
  customer_phone: phoneSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  internal_notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).strict();

export const clientAdminSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: optionalPhoneSchema.optional().or(z.literal("")),
  role: z.enum(["client", "barber", "admin"]).default("client"),
  preferred_barber_id: z.string().uuid().optional().nullable(),
  loyalty_points: z.coerce.number().int().min(0).default(0),
  internal_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.coerce.boolean().default(true),
  confirm_admin_role: z.coerce.boolean().optional(),
}).strict();

export const contactMessageAdminSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
}).strict();

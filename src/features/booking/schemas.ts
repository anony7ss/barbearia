import { z } from "zod";

const uuidSchema = z.string().uuid();
const phoneSchema = z
  .string()
  .trim()
  .max(32, "Telefone muito longo.")
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(8, "Informe um telefone valido.").max(24, "Telefone muito longo."));

export const availabilityRequestSchema = z.object({
  serviceId: uuidSchema.or(z.string().min(3)),
  barberId: uuidSchema.or(z.literal("any")).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const bookingRequestSchema = z.object({
  serviceId: uuidSchema.or(z.string().min(3)),
  barberId: uuidSchema.or(z.literal("any")).optional(),
  startsAt: z.string().datetime(),
  paymentMethod: z.enum(["pay_at_shop", "online"]).default("pay_at_shop"),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(180),
  customerPhone: phoneSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  turnstileToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();

export const bookingFormSchema = bookingRequestSchema
  .omit({ serviceId: true, barberId: true, startsAt: true, paymentMethod: true })
  .extend({
    customerEmail: z.string().trim().email("Informe um email valido.").max(180),
    acceptTerms: z.boolean().refine(Boolean, "Aceite os termos para confirmar."),
  });

export const appointmentLookupSchema = z.object({
  code: z.string().trim().regex(/^[a-fA-F0-9]{10}$/, "Codigo invalido."),
  contact: z.string().trim().min(5).max(180),
  turnstileToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();

export const cancelAppointmentSchema = z.object({
  appointmentId: uuidSchema,
  token: z.string().trim().min(24).optional(),
  reason: z.string().trim().max(240).optional(),
}).strict();

export const rescheduleAppointmentSchema = z.object({
  appointmentId: uuidSchema,
  token: z.string().trim().min(24).optional(),
  startsAt: z.string().datetime(),
}).strict();

export type BookingFormInput = z.infer<typeof bookingFormSchema>;

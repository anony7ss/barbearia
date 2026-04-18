import { z } from "zod";

const uuidSchema = z.string().uuid();

export const appointmentReviewSchema = z.object({
  appointmentId: uuidSchema,
  token: z.string().trim().min(24).max(256).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(8).max(700),
  isPublic: z.coerce.boolean().default(true),
}).strict();

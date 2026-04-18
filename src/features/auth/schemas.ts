import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Telefone muito longo.")
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(8, "Informe um telefone valido.").max(24, "Telefone muito longo."));

export const loginRequestSchema = z.object({
  email: z.string().trim().email("Informe um email valido.").max(180),
  password: z.string().min(8, "Senha invalida.").max(128),
}).strict();

export const signupRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: phoneSchema,
  email: z.string().trim().email("Informe um email valido.").max(180),
  password: z.string().min(8, "Senha invalida.").max(128),
  captchaToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();


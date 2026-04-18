import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Telefone muito longo.")
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(8, "Informe um telefone valido.").max(24, "Telefone muito longo."));

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um email valido.").max(180),
  password: z.string().min(8, "Senha invalida.").max(128),
}).strict();

export const signupRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email("Informe um email valido.").max(180),
  password: z.string().min(8, "Senha invalida.").max(128),
  captchaToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();

export const passwordRecoveryRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um email valido.").max(180),
  captchaToken: z.string().trim().max(2048).optional().or(z.literal("")),
}).strict();

export const passwordResetRequestSchema = z.object({
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "A senha deve ter no maximo 128 caracteres.")
    .regex(/[A-Za-zÀ-ÿ]/, "A senha deve ter pelo menos uma letra.")
    .regex(/\d/, "A senha deve ter pelo menos um numero."),
  confirmPassword: z.string().min(1, "Confirme a nova senha."),
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: "As senhas nao conferem.",
  path: ["confirmPassword"],
});

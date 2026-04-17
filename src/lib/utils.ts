import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatPhoneForWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function safeMessage(error: unknown) {
  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return error.message;
  }

  return "Nao foi possivel concluir a acao. Tente novamente.";
}

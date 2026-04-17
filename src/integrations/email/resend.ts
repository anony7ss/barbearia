import "server-only";

import { Resend } from "resend";

let resend: Resend | null = null;

export function isTransactionalEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getFromAddress(false));
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY nao configurado.");
    }

    return null;
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}

function getFromAddress(throwInProduction = true) {
  const from = process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL;
  if (!from && process.env.NODE_ENV === "production" && throwInProduction) {
    throw new Error("EMAIL_FROM nao configurado.");
  }

  return from;
}

type BookingEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  startsAt: string;
  lookupCode: string;
  manageUrl: string;
};

export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Agendamento confirmado - ${input.serviceName}`,
    text: [
      `Ola, ${input.customerName}.`,
      `Seu agendamento para ${input.serviceName} foi confirmado em ${input.startsAt}.`,
      `Codigo de consulta: ${input.lookupCode}`,
      `Gerencie seu horario: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

type ReminderEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  manageUrl: string;
};

export async function sendAppointmentReminderEmail(input: ReminderEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Lembrete do seu horario - ${input.serviceName}`,
    text: [
      `Ola, ${input.customerName}.`,
      `Passando para lembrar do seu horario para ${input.serviceName}.`,
      `Profissional: ${input.barberName}`,
      `Quando: ${input.startsAt}`,
      `Gerencie seu horario: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

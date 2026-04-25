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

function renderBookingConfirmationEmail(input: BookingEmailInput) {
  const greetingName = escapeHtml(input.customerName);
  const serviceName = escapeHtml(input.serviceName);
  const startsAt = escapeHtml(input.startsAt);
  const lookupCode = escapeHtml(input.lookupCode);
  const manageUrl = escapeHtml(input.manageUrl);

  return `
    <div style="margin:0;padding:0;background-color:#050505;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;background-color:#050505;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
              <tr>
                <td align="center" style="padding-bottom:18px;">
                  <div style="display:inline-block;background-color:#c99b53;color:#111111;font-size:28px;font-weight:900;line-height:28px;letter-spacing:1px;padding:14px 32px;border-radius:12px;">
                    CORTE NOBRE
                  </div>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background-color:#13110f;border:1px solid rgba(201,155,83,0.24);border-radius:18px;">
              <tr>
                <td align="center" style="padding:34px 28px 14px 28px;">
                  <p style="margin:0 0 10px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c99b53;">
                    Agendamento confirmado
                  </p>
                  <h1 style="margin:0;font-size:36px;line-height:42px;font-weight:900;color:#ffffff;">
                    Seu horario esta reservado
                  </h1>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 34px 22px 34px;">
                  <p style="margin:0;font-size:17px;line-height:28px;color:#d1d5db;">
                    Ola, ${greetingName}. Confirmamos seu atendimento de <strong style="color:#ffffff;">${serviceName}</strong> para <strong style="color:#ffffff;">${startsAt}</strong>.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 22px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0c0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
                    <tr>
                      <td style="padding:18px 20px 16px 20px;">
                        <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8f8f8f;">
                          Codigo de consulta
                        </p>
                        <p style="margin:0;font-size:28px;line-height:32px;font-weight:900;letter-spacing:2px;color:#ffffff;">
                          ${lookupCode}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 16px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="50%" style="padding-right:8px;">
                        <div style="background-color:#0d0c0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;">
                          <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8f8f8f;">
                            Servico
                          </p>
                          <p style="margin:0;font-size:16px;line-height:24px;font-weight:700;color:#ffffff;">
                            ${serviceName}
                          </p>
                        </div>
                      </td>
                      <td width="50%" style="padding-left:8px;">
                        <div style="background-color:#0d0c0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;">
                          <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8f8f8f;">
                            Horario
                          </p>
                          <p style="margin:0;font-size:16px;line-height:24px;font-weight:700;color:#ffffff;">
                            ${startsAt}
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:20px 20px 16px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#c99b53" style="border-radius:12px;">
                        <a href="${manageUrl}" style="display:inline-block;padding:16px 34px;background-color:#c99b53;color:#111111;text-decoration:none;font-size:17px;line-height:18px;font-weight:800;border-radius:12px;">
                          Ver meus horarios
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 34px 30px 34px;">
                  <p style="margin:0;font-size:14px;line-height:24px;color:#9ca3af;">
                    Guarde este codigo. Com ele voce consulta, cancela ou reagenda seu horario com mais rapidez.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
              <tr>
                <td align="center" style="padding:22px 20px 0 20px;">
                  <p style="margin:0;font-size:13px;line-height:22px;color:#8b8b8b;">
                    Se voce nao reconhece este agendamento, ignore este email.
                  </p>
                  <p style="margin:8px 0 0 0;font-size:12px;line-height:20px;color:#666666;">
                    © 2026 Corte Nobre. Todos os direitos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Agendamento confirmado - ${input.serviceName}`,
    html: renderBookingConfirmationEmail(input),
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
  reminderLabel?: string;
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
      `Passando para lembrar do seu horario para ${input.serviceName}${input.reminderLabel ? ` (${input.reminderLabel})` : ""}.`,
      `Profissional: ${input.barberName}`,
      `Quando: ${input.startsAt}`,
      `Gerencie seu horario: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

type AppointmentEventEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  manageUrl: string;
};

export async function sendAppointmentRescheduledEmail(input: AppointmentEventEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Horario reagendado - ${input.serviceName}`,
    text: [
      `Ola, ${input.customerName}.`,
      `Seu horario foi reagendado.`,
      `Servico: ${input.serviceName}`,
      `Profissional: ${input.barberName}`,
      `Novo horario: ${input.startsAt}`,
      `Gerencie seu horario: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

export async function sendAppointmentCancellationEmail(input: AppointmentEventEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Horario cancelado - ${input.serviceName}`,
    text: [
      `Ola, ${input.customerName}.`,
      `Seu horario na Corte Nobre foi cancelado.`,
      `Servico: ${input.serviceName}`,
      `Profissional: ${input.barberName}`,
      `Horario original: ${input.startsAt}`,
      `Para reservar novamente, acesse: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

export async function sendAppointmentReviewRequestEmail(input: AppointmentEventEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Como foi seu atendimento?`,
    text: [
      `Ola, ${input.customerName}.`,
      `Obrigado por visitar a Corte Nobre.`,
      `Servico: ${input.serviceName} com ${input.barberName}.`,
      "Sua avaliacao ajuda a manter o atendimento no nivel certo.",
      `Gerencie seu historico: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

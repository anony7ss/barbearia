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

type ReminderEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  manageUrl: string;
  reminderLabel?: string;
};

type AppointmentEventEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  manageUrl: string;
};

type EmailSummaryItem = {
  label: string;
  value: string;
};

type EmailLayoutInput = {
  eyebrow: string;
  title: string;
  introHtml: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  summary: EmailSummaryItem[];
  spotlightLabel?: string;
  spotlightValue?: string;
  helperText?: string;
  footerNote?: string;
};

function renderEmailLayout(input: EmailLayoutInput) {
  const spotlight = input.spotlightLabel && input.spotlightValue
    ? `
      <tr>
        <td style="padding:0 28px 22px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0c0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
            <tr>
              <td style="padding:18px 20px 16px 20px;">
                <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8f8f8f;">
                  ${escapeHtml(input.spotlightLabel)}
                </p>
                <p style="margin:0;font-size:28px;line-height:32px;font-weight:900;letter-spacing:2px;color:#ffffff;">
                  ${escapeHtml(input.spotlightValue)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const summaryRows = chunk(input.summary, 2)
    .map((row) => {
      const [left, right] = row;
      return `
        <tr>
          <td width="50%" style="padding-right:8px;vertical-align:top;">
            ${renderSummaryCard(left)}
          </td>
          <td width="50%" style="padding-left:8px;vertical-align:top;">
            ${right ? renderSummaryCard(right) : "<div></div>"}
          </td>
        </tr>`;
    })
    .join("");

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
                    ${escapeHtml(input.eyebrow)}
                  </p>
                  <h1 style="margin:0;font-size:36px;line-height:42px;font-weight:900;color:#ffffff;">
                    ${escapeHtml(input.title)}
                  </h1>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 34px 22px 34px;">
                  <div style="margin:0;font-size:17px;line-height:28px;color:#d1d5db;">
                    ${input.introHtml}
                  </div>
                </td>
              </tr>

              ${spotlight}

              <tr>
                <td style="padding:0 28px 16px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${summaryRows}
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:20px 20px 16px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#c99b53" style="border-radius:12px;">
                        <a href="${escapeHtml(input.primaryCtaUrl)}" style="display:inline-block;padding:16px 34px;background-color:#c99b53;color:#111111;text-decoration:none;font-size:17px;line-height:18px;font-weight:800;border-radius:12px;">
                          ${escapeHtml(input.primaryCtaLabel)}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 34px 30px 34px;">
                  <p style="margin:0;font-size:14px;line-height:24px;color:#9ca3af;">
                    ${escapeHtml(input.helperText ?? "Se precisar, use o acesso acima para acompanhar e ajustar seu horario.")}
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
              <tr>
                <td align="center" style="padding:22px 20px 0 20px;">
                  <p style="margin:0;font-size:13px;line-height:22px;color:#8b8b8b;">
                    ${escapeHtml(input.footerNote ?? "Se voce nao reconhece esta solicitacao, ignore este email.")}
                  </p>
                  <p style="margin:8px 0 0 0;font-size:12px;line-height:20px;color:#666666;">
                    (c) 2026 Corte Nobre. Todos os direitos reservados.
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

function renderSummaryCard(item: EmailSummaryItem) {
  return `
    <div style="background-color:#0d0c0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;">
      <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8f8f8f;">
        ${escapeHtml(item.label)}
      </p>
      <p style="margin:0;font-size:16px;line-height:24px;font-weight:700;color:#ffffff;">
        ${escapeHtml(item.value)}
      </p>
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

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
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
    html: renderEmailLayout({
      eyebrow: "Agendamento confirmado",
      title: "Seu horario esta reservado",
      introHtml: `Ola, <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Confirmamos seu atendimento de <strong style="color:#ffffff;">${escapeHtml(input.serviceName)}</strong> para <strong style="color:#ffffff;">${escapeHtml(input.startsAt)}</strong>.`,
      primaryCtaLabel: "Ver meus horarios",
      primaryCtaUrl: input.manageUrl,
      spotlightLabel: "Codigo de consulta",
      spotlightValue: input.lookupCode,
      summary: [
        { label: "Servico", value: input.serviceName },
        { label: "Horario", value: input.startsAt },
      ],
      helperText: "Guarde este codigo. Com ele voce consulta, cancela ou reage nda seu horario com mais rapidez.".replace("reage nda", "reagenda"),
      footerNote: "Se voce nao reconhece este agendamento, ignore este email.",
    }),
    text: [
      `Ola, ${input.customerName}.`,
      `Seu agendamento para ${input.serviceName} foi confirmado em ${input.startsAt}.`,
      `Codigo de consulta: ${input.lookupCode}`,
      `Gerencie seu horario: ${input.manageUrl}`,
    ].join("\n\n"),
  });

  return { skipped: false };
}

export async function sendAppointmentReminderEmail(input: ReminderEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Lembrete do seu horario - ${input.serviceName}`,
    html: renderEmailLayout({
      eyebrow: input.reminderLabel ? `Lembrete ${input.reminderLabel}` : "Lembrete de horario",
      title: "Seu atendimento esta proximo",
      introHtml: `Ola, <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Este e um lembrete do seu atendimento de <strong style="color:#ffffff;">${escapeHtml(input.serviceName)}</strong> com <strong style="color:#ffffff;">${escapeHtml(input.barberName)}</strong>.`,
      primaryCtaLabel: "Gerenciar horario",
      primaryCtaUrl: input.manageUrl,
      summary: [
        { label: "Servico", value: input.serviceName },
        { label: "Profissional", value: input.barberName },
        { label: "Quando", value: input.startsAt },
        { label: "Status", value: "Confirmado na agenda" },
      ],
      helperText: "Se precisar ajustar o horario, use o acesso acima antes da janela limite de reagendamento.",
      footerNote: "Se esse horario ja nao fizer sentido para voce, ajuste o quanto antes para evitar conflito na agenda.",
    }),
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

export async function sendAppointmentRescheduledEmail(input: AppointmentEventEmailInput) {
  const client = getResendClient();

  if (!client) {
    return { skipped: true };
  }

  await client.emails.send({
    from: getFromAddress() ?? "Corte Nobre <agenda@example.com>",
    to: input.to,
    subject: `Horario reagendado - ${input.serviceName}`,
    html: renderEmailLayout({
      eyebrow: "Horario reagendado",
      title: "Seu novo horario ja esta confirmado",
      introHtml: `Ola, <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Seu atendimento foi reagendado com sucesso. Abaixo esta o novo horario confirmado na Corte Nobre.`,
      primaryCtaLabel: "Revisar horario",
      primaryCtaUrl: input.manageUrl,
      summary: [
        { label: "Servico", value: input.serviceName },
        { label: "Profissional", value: input.barberName },
        { label: "Novo horario", value: input.startsAt },
        { label: "Status", value: "Reagendado" },
      ],
      helperText: "Confira os dados acima para evitar qualquer desencontro no dia do atendimento.",
      footerNote: "Se voce nao solicitou esse reagendamento, revise seu historico pelo link acima.",
    }),
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
    html: renderEmailLayout({
      eyebrow: "Horario cancelado",
      title: "Seu atendimento foi cancelado",
      introHtml: `Ola, <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Registramos o cancelamento do seu horario para <strong style="color:#ffffff;">${escapeHtml(input.serviceName)}</strong>. Quando quiser, voce pode reservar novamente.`,
      primaryCtaLabel: "Agendar novamente",
      primaryCtaUrl: input.manageUrl,
      summary: [
        { label: "Servico", value: input.serviceName },
        { label: "Profissional", value: input.barberName },
        { label: "Horario original", value: input.startsAt },
        { label: "Status", value: "Cancelado" },
      ],
      helperText: "Se o cancelamento foi um engano, volte para sua area e reserve um novo horario.",
      footerNote: "Este email serve apenas como registro operacional do cancelamento.",
    }),
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
    subject: "Como foi seu atendimento?",
    html: renderEmailLayout({
      eyebrow: "Sua opiniao importa",
      title: "Avalie seu atendimento",
      introHtml: `Ola, <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Obrigado por passar na Corte Nobre. Sua avaliacao sobre <strong style="color:#ffffff;">${escapeHtml(input.serviceName)}</strong> com <strong style="color:#ffffff;">${escapeHtml(input.barberName)}</strong> ajuda a manter o nivel da operacao.`,
      primaryCtaLabel: "Abrir meus horarios",
      primaryCtaUrl: input.manageUrl,
      summary: [
        { label: "Servico", value: input.serviceName },
        { label: "Profissional", value: input.barberName },
        { label: "Atendimento", value: input.startsAt },
        { label: "Acao", value: "Deixe sua avaliacao" },
      ],
      helperText: "Leva menos de um minuto e ajuda outros clientes a escolherem melhor.",
      footerNote: "Obrigado por confiar sua agenda a Corte Nobre.",
    }),
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

"use client";

import Link from "next/link";
import { CalendarPlus, CheckCircle2, Copy, CreditCard, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { brand } from "@/lib/site-data";
import { formatCurrency } from "@/lib/utils";

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  payment_method?: "pay_at_shop" | "online";
  payment_status?: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  payment_amount_cents?: number;
  services?: { name: string; price_cents: number; duration_minutes: number } | null;
  barbers?: { name: string } | null;
};

export function BookingSuccess({
  appointmentId,
  code,
}: {
  appointmentId?: string;
  code?: string;
}) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [error, setError] = useState(!appointmentId);
  const [copied, setCopied] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    fetch(`/api/booking/appointments/${appointmentId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("not-found");
        return response.json();
      })
      .then((payload) => {
        setAppointment(payload.appointment);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [appointmentId]);

  const calendarUrl = useMemo(() => {
    if (!appointment) return "#";
    const text = `Corte Nobre - ${appointment.services?.name ?? "Agendamento"}`;
    const details = `Barbeiro: ${appointment.barbers?.name ?? "Corte Nobre"}\nCodigo: ${code ?? ""}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${formatForGoogle(appointment.starts_at)}/${formatForGoogle(appointment.ends_at)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(brand.address)}`;
  }, [appointment, code]);

  const whatsappUrl = useMemo(() => {
    if (!appointment) return "#";
    const text = `Ola! Meu agendamento na Corte Nobre foi confirmado. Codigo: ${code ?? ""}. Servico: ${appointment.services?.name ?? "servico"} em ${formatDate(appointment.starts_at)}.`;
    return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
  }, [appointment, code]);

  async function payOnline() {
    if (!appointmentId) return;
    setPaymentLoading(true);
    setPaymentError(null);

    const response = await fetch(`/api/booking/appointments/${appointmentId}/payment-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      setPaymentLoading(false);
      setPaymentError("Nao foi possivel iniciar o pagamento online agora.");
      return;
    }

    const payload = (await response.json()) as { checkoutUrl?: string };
    if (!payload.checkoutUrl) {
      setPaymentLoading(false);
      setPaymentError("Checkout indisponivel no momento.");
      return;
    }

    window.location.assign(payload.checkoutUrl);
  }

  if (loading) {
    return <LoadingState title="Carregando confirmacao" description="Buscando os detalhes do seu horario." />;
  }

  if (error || !appointment) {
    return <ErrorState title="Nao foi possivel abrir a confirmacao" description="Use o codigo enviado ou consulte em Meus agendamentos." />;
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-line bg-smoke p-6 shadow-[0_28px_120px_rgba(0,0,0,0.35)] sm:p-10">
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-brass/12 blur-3xl" />
      <div className="relative">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brass text-ink">
          <CheckCircle2 size={28} aria-hidden="true" />
        </span>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-brass">
          confirmado
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Seu horario esta reservado.
        </h1>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-[1.5rem] border border-line bg-background/45 p-5">
            <p className="text-sm text-muted">Agendamento</p>
            <h2 className="mt-2 text-2xl font-semibold">{appointment.services?.name ?? "Servico"}</h2>
            <p className="mt-3 text-muted">{formatDate(appointment.starts_at)}</p>
            <p className="mt-1 text-sm text-muted">
              {appointment.barbers?.name ?? "Barbeiro"} · {appointment.services?.duration_minutes ?? 0} min · {formatCurrency(appointment.services?.price_cents ?? 0)}
            </p>
            <p className="mt-4 inline-flex rounded-full border border-line bg-background/55 px-3 py-1 text-xs font-semibold text-muted">
              Pagamento: {paymentStatusLabel(appointment)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-brass/35 bg-brass/10 p-5">
            <p className="text-sm text-muted">Codigo de consulta</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <strong className="font-mono text-3xl text-brass">{code ?? "------"}</strong>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(code ?? "");
                  setCopied(true);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
                aria-label="Copiar codigo"
              >
                <Copy size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">
              {copied ? "Codigo copiado." : "Guarde para consultar sem criar conta."}
            </p>
          </div>
        </div>

        {paymentError ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
            {paymentError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {appointment.payment_status !== "paid" ? (
            <button
              type="button"
              onClick={payOnline}
              disabled={paymentLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink disabled:opacity-70"
            >
              {paymentLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}
              Pagar online
            </button>
          ) : null}
          <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink" href={calendarUrl} target="_blank" rel="noreferrer">
            <CalendarPlus size={16} aria-hidden="true" />
            Google Calendar
          </a>
          <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold" href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp
          </a>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold"
            href={`/meus-agendamentos?id=${appointmentId}`}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Gerenciar
          </Link>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold" href="/cadastro">
            Criar conta
          </Link>
        </div>
      </div>
    </section>
  );
}

function paymentStatusLabel(appointment: Appointment) {
  if (appointment.payment_status === "paid") return "pago online";
  if (appointment.payment_status === "pending") return "online pendente";
  if (appointment.payment_status === "failed") return "falhou";
  if (appointment.payment_status === "refunded") return "reembolsado";
  return appointment.payment_method === "online" ? "online pendente" : "pagar no local";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatForGoogle(value: string) {
  return new Date(value).toISOString().replace(/[-:]|\.\d{3}/g, "");
}

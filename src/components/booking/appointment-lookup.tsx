"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, Copy, RefreshCw, XCircle } from "lucide-react";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { type ClientSlot, TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { Dialog } from "@/components/ui/dialog";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, LoadingState, SuccessState } from "@/components/ui/state";
import { type AppointmentPolicy, formatLimit } from "@/lib/appointment-policy";
import { formatCurrency } from "@/lib/utils";

type AppointmentView = {
  id: string;
  service_id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  guest_lookup_code?: string | null;
  policy?: AppointmentPolicy;
  services?: { name: string; price_cents: number; duration_minutes: number } | null;
  barbers?: { name: string } | null;
};

type AppointmentCardProps = {
  appointment: AppointmentView;
  token?: string;
  canManage?: boolean;
  onChanged?: (appointment: AppointmentView) => void;
};

export function AppointmentLookup({ tokenId, token }: { tokenId?: string; token?: string }) {
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
    fetch(`/api/booking/appointments/${tokenId}${tokenQuery}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("not-found");
        return response.json();
      })
      .then((payload) => setAppointment(payload.appointment))
      .catch(() => setError("Link invalido ou expirado."));
  }, [token, tokenId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.turnstileToken = String(data["cf-turnstile-response"] ?? "");
    const response = await fetch("/api/booking/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      setError("Nao encontramos um horario com esses dados.");
      return;
    }

    const payload = await response.json();
    setAppointment(payload.appointment);
  }

  async function copyCode() {
    const code = appointment?.guest_lookup_code;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-[2rem] border border-line bg-smoke p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input name="code" placeholder="Codigo" required className="field" />
        <input name="contact" placeholder="Telefone ou email" required className="field" />
        <button className="min-h-12 rounded-full bg-brass px-5 text-sm font-bold text-ink">
          Consultar
        </button>
        <div className="sm:col-span-3">
          <TurnstileField />
        </div>
      </form>

      {error ? <ErrorState title={error} /> : null}
      {copied ? <SuccessState title="Codigo copiado" /> : null}
      {appointment ? (
        <AppointmentCard
          appointment={appointment}
          token={token}
          canManage={Boolean(tokenId || token)}
          onChanged={setAppointment}
        >
          {appointment.guest_lookup_code ? (
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              <Copy size={14} aria-hidden="true" />
              Copiar codigo
            </button>
          ) : null}
        </AppointmentCard>
      ) : null}
    </div>
  );
}

export function AppointmentCard({
  appointment: initialAppointment,
  token,
  canManage = false,
  onChanged,
  children,
}: AppointmentCardProps & { children?: ReactNode }) {
  const [appointment, setAppointment] = useState(initialAppointment);
  const [modal, setModal] = useState<"cancel" | "reschedule" | null>(null);
  const [date, setDate] = useState(() => appointment.starts_at.slice(0, 10));
  const [slots, setSlots] = useState<ClientSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ClientSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const policy = appointment.policy;
  const canCancel = canManage && appointment.status !== "cancelled" && (policy?.canCancel ?? true);
  const canReschedule = canManage && appointment.status !== "cancelled" && (policy?.canReschedule ?? true);
  const formattedDate = useMemo(() => formatDate(appointment.starts_at), [appointment.starts_at]);

  useEffect(() => {
    setAppointment(initialAppointment);
  }, [initialAppointment]);

  useEffect(() => {
    if (modal !== "reschedule") return;
    const controller = new AbortController();
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: appointment.service_id,
        barberId: appointment.barber_id,
        date,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("availability");
        return response.json() as Promise<{ slots: ClientSlot[] }>;
      })
      .then((payload) => setSlots(payload.slots))
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setSlots([]);
        setError("Nao foi possivel carregar horarios para reagendar.");
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [appointment.barber_id, appointment.service_id, date, modal]);

  async function cancelAppointment() {
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/booking/appointments/${appointment.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(await readError(response, "Nao foi possivel cancelar."));
      return;
    }

    const next = { ...appointment, status: "cancelled", policy: undefined };
    setAppointment(next);
    onChanged?.(next);
    setModal(null);
    setSubmitting(false);
    setMessage("Agendamento cancelado. O horario foi liberado na agenda.");
  }

  async function rescheduleAppointment() {
    if (!selectedSlot) {
      setError("Escolha o novo horario.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/booking/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, startsAt: selectedSlot.startsAt }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(await readError(response, "Nao foi possivel reagendar."));
      return;
    }

    const next = {
      ...appointment,
      starts_at: selectedSlot.startsAt,
      ends_at: selectedSlot.endsAt,
      status: "confirmed",
      policy: undefined,
    };
    setAppointment(next);
    onChanged?.(next);
    setModal(null);
    setSubmitting(false);
    setMessage("Agendamento reagendado com sucesso.");
  }

  return (
    <div className="rounded-[2rem] border border-line bg-smoke p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
            {statusLabel(appointment.status)}
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{appointment.services?.name ?? "Servico"}</h2>
          <p className="mt-2 text-muted">
            {formattedDate} · {appointment.barbers?.name ?? "Barbeiro"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {appointment.services?.duration_minutes ?? 0} min ·{" "}
            {formatCurrency(appointment.services?.price_cents ?? 0)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {children}
          {canManage ? (
            <>
              <button
                type="button"
                onClick={() => setModal("reschedule")}
                disabled={!canReschedule}
                title={policy?.rescheduleReason ?? undefined}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Reagendar
              </button>
              <button
                type="button"
                onClick={() => setModal("cancel")}
                disabled={!canCancel}
                title={policy?.cancelReason ?? undefined}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                <XCircle size={14} aria-hidden="true" />
                Cancelar
              </button>
            </>
          ) : (
            <p className="max-w-xs text-xs leading-5 text-muted">
              Para alterar este horario sem login, use o link seguro recebido na confirmacao.
            </p>
          )}
        </div>
      </div>

      {message ? <SuccessState title={message} /> : null}
      {policy && canManage && (!policy.canCancel || !policy.canReschedule) ? (
        <p className="mt-5 rounded-2xl border border-line bg-background/50 p-3 text-xs leading-5 text-muted">
          Cancelamento ate {formatLimit(policy.cancellationLimitMinutes)} antes. Reagendamento ate{" "}
          {formatLimit(policy.rescheduleLimitMinutes)} antes.
        </p>
      ) : null}

      <Dialog open={modal === "cancel"} onClose={() => setModal(null)} title="Cancelar agendamento">
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-muted">
            O horario de {formattedDate} sera liberado. Esta acao respeita a regra de antecedencia da barbearia.
          </p>
          <label className="grid gap-2 text-sm font-medium">
            Motivo opcional
            <textarea
              id="appointment-cancel-reason"
              name="appointment_cancel_reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={240}
              rows={4}
              className="rounded-2xl border border-line bg-background px-4 py-3 text-foreground outline-none transition focus:border-brass"
            />
          </label>
          {error ? <div className="lg:col-span-2"><ErrorState title={error} /></div> : null}
          <button
            type="button"
            onClick={cancelAppointment}
            disabled={submitting}
            className="min-h-12 rounded-full bg-brass px-5 text-sm font-bold text-ink disabled:opacity-60"
          >
            {submitting ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </Dialog>

      <Dialog
        open={modal === "reschedule"}
        onClose={() => setModal(null)}
        title="Reagendar horario"
        className="max-w-none w-[min(94vw,78rem)]"
      >
        <div className="grid gap-4 md:max-h-[calc(100svh-10rem)] md:min-h-0 md:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.1fr)] md:items-start md:overflow-hidden">
          <div className="grid content-start gap-4 md:min-h-0 md:self-start">
          <div className="rounded-2xl border border-line bg-background/60 p-4 text-sm leading-6 text-muted md:rounded-xl md:p-3">
            <p className="break-words">Atual: {formattedDate}</p>
            <p className="break-words">
              Novo:{" "}
              {selectedSlot ? `${formatDate(selectedSlot.startsAt)} · ${selectedSlot.barberName}` : "escolha uma data e horario"}
            </p>
          </div>
          <div className="md:min-h-0 md:overflow-visible">
            <BookingCalendar value={date} onChange={setDate} compact />
          </div>
          </div>
          <div className="md:min-h-0 md:max-h-[26rem] md:overflow-y-auto md:pr-1">
            {loadingSlots ? (
              <LoadingState title="Carregando horarios" />
            ) : (
              <TimeSlotPicker slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} compact />
            )}
          </div>
          {error ? <div className="md:col-span-2"><ErrorState title={error} /></div> : null}
          <div className="sticky bottom-0 -mx-1 bg-smoke/95 pt-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:pt-0 sm:backdrop-blur-0 md:col-span-2">
            <button
              type="button"
              onClick={rescheduleAppointment}
              disabled={submitting || !selectedSlot}
              className="min-h-12 w-full rounded-full bg-brass px-5 text-sm font-bold text-ink disabled:opacity-60"
            >
              {submitting ? "Reagendando..." : "Confirmar novo horario"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "No-show",
  };

  return labels[status] ?? status;
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

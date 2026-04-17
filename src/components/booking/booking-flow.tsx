"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Clock3, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { type ClientSlot, TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { bookingFormSchema, type BookingFormInput } from "@/features/booking/schemas";
import { barbers, services } from "@/lib/site-data";
import { formatCurrency } from "@/lib/utils";

type BookingSuccess = {
  appointmentId: string;
  lookupCode: string;
  accessToken: string;
  manageUrl: string;
  successUrl: string;
};

export function BookingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialService = services.find((service) => service.slug === searchParams.get("service")) ?? services[0];
  const initialBarber = barbers.find((barber) => barber.slug === searchParams.get("barber"));
  const [serviceId, setServiceId] = useState(initialService.id);
  const [barberId, setBarberId] = useState(initialBarber?.id ?? "any");
  const [date, setDate] = useState(getToday());
  const [slots, setSlots] = useState<ClientSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ClientSlot | null>(null);
  const [availabilityState, setAvailabilityState] = useState<"idle" | "loading" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? services[0],
    [serviceId],
  );

  const form = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema as never),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
      acceptTerms: false,
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    setAvailabilityState("loading");
    setSelectedSlot(null);

    fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, barberId, date }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("availability");
        }
        return response.json() as Promise<{ slots: ClientSlot[] }>;
      })
      .then((payload) => {
        setSlots(payload.slots);
        setAvailabilityState("idle");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSlots([]);
        setAvailabilityState("error");
      });

    return () => controller.abort();
  }, [barberId, date, serviceId]);

  async function submit(values: BookingFormInput) {
    if (!selectedSlot) {
      setSubmitError("Escolha um horario para continuar.");
      return;
    }

    setSubmitError(null);
    const response = await fetch("/api/booking/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        barberId: selectedSlot.barberId,
        startsAt: selectedSlot.startsAt,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone,
        notes: values.notes,
        turnstileToken: getTurnstileToken(),
      }),
    });

    if (!response.ok) {
      setSubmitError("Nao foi possivel confirmar. O horario pode ter acabado de ser reservado.");
      return;
    }

    const payload = (await response.json()) as BookingSuccess;
    const accessResponse = await fetch("/api/booking/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: payload.appointmentId,
        token: payload.accessToken,
      }),
    });

    if (!accessResponse.ok) {
      setSubmitError("Agendamento criado, mas nao foi possivel abrir o link seguro. Use o codigo enviado.");
      return;
    }

    router.replace(payload.successUrl);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.72fr_0.28fr]">
      <div className="grid gap-6">
        <Step title="1. Servico" icon={<CalendarCheck size={18} />}>
          <div className="grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => setServiceId(service.id)}
                className={`rounded-3xl border p-5 text-left transition ${
                  serviceId === service.id
                    ? "border-brass bg-brass text-ink"
                    : "border-line bg-white/[0.03] hover:border-brass/60"
                }`}
              >
                <span className="text-lg font-semibold">{service.name}</span>
                <span className="mt-2 block text-sm opacity-75">
                  {service.durationMinutes} min · {formatCurrency(service.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </Step>

        <Step title="2. Barbeiro" icon={<UserRound size={18} />}>
          <div className="grid gap-3 md:grid-cols-4">
            <button
              type="button"
              onClick={() => setBarberId("any")}
              className={`rounded-3xl border p-5 text-left transition ${
                barberId === "any" ? "border-brass bg-brass text-ink" : "border-line bg-white/[0.03]"
              }`}
            >
              <span className="font-semibold">Qualquer disponivel</span>
              <span className="mt-2 block text-xs opacity-75">Menor friccao</span>
            </button>
            {barbers.map((barber) => (
              <button
                type="button"
                key={barber.id}
                onClick={() => setBarberId(barber.id)}
                className={`rounded-3xl border p-5 text-left transition ${
                  barberId === barber.id ? "border-brass bg-brass text-ink" : "border-line bg-white/[0.03]"
                }`}
              >
                <span className="font-semibold">{barber.name.split(" ")[0]}</span>
                <span className="mt-2 block text-xs opacity-75">{barber.specialties[0]}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step title="3. Data e horario" icon={<Clock3 size={18} />}>
          <BookingCalendar value={date} onChange={setDate} />
          <div className="mt-5">
            {availabilityState === "loading" ? (
              <LoadingState title="Buscando horarios" description="Validando agenda, bloqueios e conflitos." />
            ) : availabilityState === "error" ? (
              <ErrorState title="Agenda indisponivel" description="Confira a configuracao do Supabase e tente novamente." />
            ) : (
              <TimeSlotPicker slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
            )}
          </div>
        </Step>

        <Step title="4. Seus dados" icon={<CheckCircle2 size={18} />}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome" error={form.formState.errors.customerName?.message}>
              <input id="booking-customer-name" {...form.register("customerName")} className="field" autoComplete="name" />
            </Field>
            <Field label="Telefone" error={form.formState.errors.customerPhone?.message}>
              <input id="booking-customer-phone" {...form.register("customerPhone")} className="field" inputMode="tel" autoComplete="tel" />
            </Field>
            <Field label="Email" error={form.formState.errors.customerEmail?.message}>
              <input id="booking-customer-email" {...form.register("customerEmail")} className="field" type="email" autoComplete="email" />
            </Field>
            <Field label="Observacao" error={form.formState.errors.notes?.message}>
              <input id="booking-notes" {...form.register("notes")} className="field" placeholder="Opcional" />
            </Field>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm text-muted">
            <input id="booking-accept-terms" type="checkbox" {...form.register("acceptTerms")} className="mt-1 h-4 w-4 accent-brass" />
            Aceito os termos de agendamento e autorizo comunicacoes transacionais sobre este horario.
          </label>
          <div className="mt-5">
            <TurnstileField />
          </div>
          {form.formState.errors.acceptTerms?.message ? (
            <p className="mt-2 text-sm text-brass">{form.formState.errors.acceptTerms.message}</p>
          ) : null}
        </Step>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[2rem] border border-line bg-smoke p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brass">
            Resumo
          </p>
          <div className="mt-5 space-y-4 text-sm text-muted">
            <SummaryItem label="Servico" value={selectedService.name} />
            <SummaryItem label="Duracao" value={`${selectedService.durationMinutes} min`} />
            <SummaryItem label="Valor" value={formatCurrency(selectedService.priceCents)} />
            <SummaryItem
              label="Horario"
              value={selectedSlot ? formatSlot(selectedSlot.startsAt) : "Escolha um horario"}
            />
            <SummaryItem label="Barbeiro" value={selectedSlot?.barberName ?? "A definir"} />
          </div>
          <AnimatePresence>
            {submitError ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 text-sm text-brass">
                {submitError}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
          </button>
          <p className="mt-4 text-xs leading-5 text-muted">
            Nao precisa criar conta. Se entrar depois, seu historico fica salvo.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Step({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-line bg-smoke/72 p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass text-ink">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
      {error ? <span className="text-xs text-brass">{error}</span> : null}
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
      <span>{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function getToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function formatSlot(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getTurnstileToken() {
  return document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? "";
}

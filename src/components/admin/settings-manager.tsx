"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Save, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Settings = {
  business_name: string;
  timezone: string;
  min_notice_minutes: number;
  max_advance_days: number;
  cancellation_limit_minutes: number;
  reschedule_limit_minutes: number;
  slot_interval_minutes: number;
  default_buffer_minutes: number;
  whatsapp_phone: string | null;
  email: string | null;
  address: string | null;
};

export function SettingsManager({ settings }: { settings: Settings }) {
  const [current, setCurrent] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      business_name: String(formData.get("business_name") ?? "").trim(),
      timezone: String(formData.get("timezone") ?? "").trim(),
      min_notice_minutes: Number(formData.get("min_notice_minutes") || 0),
      max_advance_days: Number(formData.get("max_advance_days") || 30),
      cancellation_limit_minutes: Number(formData.get("cancellation_limit_minutes") || 0),
      reschedule_limit_minutes: Number(formData.get("reschedule_limit_minutes") || 0),
      slot_interval_minutes: Number(formData.get("slot_interval_minutes") || 15),
      default_buffer_minutes: Number(formData.get("default_buffer_minutes") || 0),
      whatsapp_phone: String(formData.get("whatsapp_phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
    };

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Nao foi possivel salvar as configuracoes.");
      return;
    }

    const data = await response.json();
    setCurrent(data.settings);
    setMessage("Configuracoes salvas.");
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-brass text-ink">
            <Settings2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">Regras da operacao</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Estes valores controlam disponibilidade, antecedencia, cancelamento, reagendamento e dados usados em emails.
            </p>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-300/25 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      <section className="grid gap-4 rounded-[1.5rem] border border-line bg-smoke p-5 lg:grid-cols-2">
        <Field label="Nome da barbearia">
          <input name="business_name" required defaultValue={current.business_name} className="field w-full" />
        </Field>
        <Field label="Timezone">
          <input name="timezone" required defaultValue={current.timezone} className="field w-full" />
        </Field>
        <Field label="Telefone WhatsApp">
          <input name="whatsapp_phone" defaultValue={current.whatsapp_phone ?? ""} className="field w-full" />
        </Field>
        <Field label="Email operacional">
          <input name="email" type="email" defaultValue={current.email ?? ""} className="field w-full" />
        </Field>
        <Field label="Endereco" className="lg:col-span-2">
          <input name="address" defaultValue={current.address ?? ""} className="field w-full" />
        </Field>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-line bg-smoke p-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Horario minimo para agendar">
          <NumberField name="min_notice_minutes" value={current.min_notice_minutes} suffix="min" />
        </Field>
        <Field label="Limite para cancelar">
          <NumberField name="cancellation_limit_minutes" value={current.cancellation_limit_minutes} suffix="min" />
        </Field>
        <Field label="Limite para reagendar">
          <NumberField name="reschedule_limit_minutes" value={current.reschedule_limit_minutes} suffix="min" />
        </Field>
        <Field label="Intervalo dos slots">
          <select name="slot_interval_minutes" defaultValue={current.slot_interval_minutes} className="field w-full">
            {[10, 15, 20, 30, 60].map((value) => (
              <option key={value} value={value}>{value} minutos</option>
            ))}
          </select>
        </Field>
        <Field label="Dias de antecedencia">
          <NumberField name="max_advance_days" value={current.max_advance_days} suffix="dias" />
        </Field>
        <Field label="Buffer padrao">
          <NumberField name="default_buffer_minutes" value={current.default_buffer_minutes} suffix="min" />
        </Field>
      </section>

      <div className="flex justify-end">
        <button
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-6 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-60"
        >
          <Save size={17} aria-hidden="true" />
          {saving ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ name, value, suffix }: { name: string; value: number; suffix: string }) {
  return (
    <div className="relative">
      <input name={name} type="number" min="0" defaultValue={value} className="field w-full pr-16" />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
        {suffix}
      </span>
    </div>
  );
}

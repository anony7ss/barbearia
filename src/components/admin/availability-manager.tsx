"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarOff, Clock3, Plus, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type Barber = { id: string; name: string };
type Rule = {
  id: string;
  barber_id?: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  barbers?: { name: string } | null;
};
type Block = {
  id: string;
  barber_id?: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  barbers?: { name: string } | null;
};

export function AvailabilityManager({
  barbers,
  initialRules,
  initialBlocks,
}: {
  barbers: Barber[];
  initialRules: Rule[];
  initialBlocks: Block[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const barberId = String(data.get("barber_id") ?? "") || null;
    const response = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "rule",
        barber_id: barberId,
        weekday: Number(data.get("weekday")),
        start_time: data.get("start_time"),
        end_time: data.get("end_time"),
        break_start: data.get("break_start"),
        break_end: data.get("break_end"),
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel criar a regra. Confira os horarios e tente novamente.");
      return;
    }

    const payload = await response.json();
    setRules((current) => [attachBarber(payload.rule, barberId, barbers), ...current]);
    form.reset();
    setRuleDialogOpen(false);
  }

  async function createBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const barberId = String(data.get("barber_id") ?? "") || null;
    const response = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blocked_slot",
        barber_id: barberId,
        starts_at: new Date(String(data.get("starts_at"))).toISOString(),
        ends_at: new Date(String(data.get("ends_at"))).toISOString(),
        reason: String(data.get("reason") ?? "").trim(),
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel bloquear o periodo. Confira data, hora e tente novamente.");
      return;
    }

    const payload = await response.json();
    setBlocks((current) => [attachBarber(payload.block, barberId, barbers), ...current]);
    form.reset();
    setBlockDialogOpen(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Disponibilidade</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Escala, pausas e bloqueios com controle claro.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Regras definem quando a barbearia atende. Bloqueios removem periodos especificos da agenda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRuleDialogOpen(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a]"
            >
              <Plus size={17} aria-hidden="true" />
              Adicionar regra
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setBlockDialogOpen(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              <CalendarOff size={17} aria-hidden="true" />
              Bloquear periodo
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <AvailabilityStat icon={<Clock3 size={17} />} label="Regras" value={rules.length} detail="janelas recorrentes" />
          <AvailabilityStat icon={<CalendarOff size={17} />} label="Bloqueios" value={blocks.length} detail="periodos futuros" />
          <AvailabilityStat icon={<ShieldCheck size={17} />} label="Escopo" value={barbers.length} detail="barbeiros ativos" />
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="grid gap-4">
          <SectionHeader
            title="Horarios de funcionamento"
            description="Janelas semanais usadas no calculo de horarios disponiveis."
          />
          {rules.length ? (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma regra cadastrada" description="Crie uma regra para liberar horarios na agenda." />
          )}
        </section>

        <section className="grid gap-4">
          <SectionHeader
            title="Bloqueios, folgas e ferias"
            description="Periodos fechados para toda a barbearia ou para um barbeiro especifico."
          />
          {blocks.length ? (
            <div className="grid gap-3">
              {blocks.map((block) => (
                <BlockCard key={block.id} block={block} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum bloqueio futuro" description="Use bloqueios para folgas, manutencao ou agenda externa." />
          )}
        </section>
      </div>

      <Dialog
        open={ruleDialogOpen}
        title="Adicionar regra"
        description="Defina um dia da semana, janela de atendimento e pausa opcional."
        onClose={() => {
          if (!submitting) setRuleDialogOpen(false);
        }}
      >
        <form onSubmit={createRule} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Profissional">
              <select name="barber_id" className="field w-full">
                <option value="">Todos os barbeiros</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dia da semana">
              <select name="weekday" className="field w-full" required>
                {["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"].map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inicio">
              <input name="start_time" type="time" required className="field w-full" />
            </Field>
            <Field label="Fim">
              <input name="end_time" type="time" required className="field w-full" />
            </Field>
            <Field label="Inicio da pausa">
              <input name="break_start" type="time" className="field w-full" />
            </Field>
            <Field label="Fim da pausa">
              <input name="break_end" type="time" className="field w-full" />
            </Field>
          </div>

          <DialogActions onCancel={() => setRuleDialogOpen(false)} submitting={submitting} submitLabel="Salvar regra" />
        </form>
      </Dialog>

      <Dialog
        open={blockDialogOpen}
        title="Bloquear periodo"
        description="Feche horarios por folga, ferias, manutencao ou compromisso externo."
        onClose={() => {
          if (!submitting) setBlockDialogOpen(false);
        }}
      >
        <form onSubmit={createBlock} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Escopo" className="md:col-span-2">
              <select name="barber_id" className="field w-full">
                <option value="">Toda a barbearia</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inicio">
              <input name="starts_at" type="datetime-local" required className="field w-full" />
            </Field>
            <Field label="Fim">
              <input name="ends_at" type="datetime-local" required className="field w-full" />
            </Field>
            <Field label="Motivo" className="md:col-span-2">
              <input name="reason" placeholder="Folga, ferias, manutencao..." className="field w-full" />
            </Field>
          </div>

          <DialogActions onCancel={() => setBlockDialogOpen(false)} submitting={submitting} submitLabel="Bloquear periodo" />
        </form>
      </Dialog>
    </div>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-smoke p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{weekdayName(rule.weekday)}</p>
          <p className="mt-1 text-sm text-muted">{rule.barbers?.name ?? "Todos os barbeiros"}</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-brass">
          {formatTime(rule.start_time)}-{formatTime(rule.end_time)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MiniLine label="Atendimento" value={`${formatTime(rule.start_time)} ate ${formatTime(rule.end_time)}`} />
        <MiniLine
          label="Pausa"
          value={rule.break_start && rule.break_end ? `${formatTime(rule.break_start)} ate ${formatTime(rule.break_end)}` : "Sem pausa"}
        />
      </div>
    </article>
  );
}

function BlockCard({ block }: { block: Block }) {
  return (
    <article className="rounded-[1.25rem] border border-line bg-smoke p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{block.reason || "Bloqueio"}</p>
          <p className="mt-1 text-sm text-muted">{block.barbers?.name ?? "Toda a barbearia"}</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Fechado</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MiniLine label="Inicio" value={formatDate(block.starts_at)} />
        <MiniLine label="Fim" value={formatDate(block.ends_at)} />
      </div>
    </article>
  );
}

function DialogActions({
  onCancel,
  submitting,
  submitLabel,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55"
      >
        Cancelar
      </button>
      <button
        disabled={submitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-55"
      >
        <Plus size={16} aria-hidden="true" />
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </div>
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function AvailabilityStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-4">
      <div className="flex items-center gap-2 text-brass">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function attachBarber<T extends { barber_id?: string | null }>(item: T, barberId: string | null, barbers: Barber[]) {
  const barber = barberId ? barbers.find((entry) => entry.id === barberId) : null;
  return {
    ...item,
    barber_id: barberId,
    barbers: barber ? { name: barber.name } : null,
  };
}

function weekdayName(index: number) {
  return ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][index] ?? String(index);
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { cn, formatCurrency } from "@/lib/utils";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus | string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  services?: { name: string; price_cents: number; duration_minutes?: number } | null;
  barbers?: { name: string } | null;
};

const statusOptions: Array<{ value: AppointmentStatus; label: string; description: string }> = [
  { value: "pending", label: "Pendente", description: "Aguardando confirmacao da barbearia." },
  { value: "confirmed", label: "Confirmado", description: "Horario confirmado e reservado na agenda." },
  { value: "completed", label: "Concluido", description: "Atendimento finalizado com sucesso." },
  { value: "cancelled", label: "Cancelado", description: "Horario cancelado e removido da operacao." },
  { value: "no_show", label: "No-show", description: "Cliente nao compareceu ao atendimento." },
];

export function AppointmentsTable({
  appointments,
  compact = false,
}: {
  appointments: AppointmentRow[];
  compact?: boolean;
}) {
  const [rows, setRows] = useState(appointments);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<AppointmentRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const text = [
        row.customer_name,
        row.customer_phone,
        row.customer_email,
        row.services?.name,
        row.barbers?.name,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [query, rows]);

  if (!rows.length) {
    return <EmptyState title="Nenhum agendamento encontrado" description="A agenda esta livre para o periodo selecionado." />;
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    setError(null);
    setUpdatingId(id);

    const response = status === "cancelled"
      ? await fetch(`/api/admin/appointments/${id}`, { method: "DELETE" })
      : await fetch(`/api/admin/appointments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

    setUpdatingId(null);

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status do agendamento.");
      return false;
    }

    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    setStatusTarget((current) => (current?.id === id ? { ...current, status } : current));
    return true;
  }

  return (
    <div className="grid gap-3">
      <div className={cn("flex flex-col justify-between gap-3 sm:flex-row sm:items-center", compact && "hidden")}>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, servico, barbeiro ou status"
            className="field field-search w-full"
          />
        </div>
        <p className="text-sm text-muted">{visibleRows.length} de {rows.length} agendamentos</p>
      </div>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      <div className="overflow-x-auto rounded-[1.25rem] border border-line bg-background/35">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Horario</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Servico</th>
              <th className="px-4 py-3 font-semibold">Barbeiro</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((appointment) => (
              <tr key={appointment.id} className="border-t border-line transition hover:bg-white/[0.025]">
                <td className="px-4 py-4">
                  <p className="font-mono text-xs text-foreground">{formatDate(appointment.starts_at)}</p>
                  <p className="mt-1 font-mono text-[0.68rem] text-muted">{formatHour(appointment.ends_at)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{appointment.customer_name}</p>
                  <p className="mt-1 text-xs text-muted">{appointment.customer_phone}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{appointment.services?.name ?? "-"}</p>
                  {appointment.services?.duration_minutes ? (
                    <p className="mt-1 text-xs text-muted">{appointment.services.duration_minutes} min</p>
                  ) : null}
                </td>
                <td className="px-4 py-4">{appointment.barbers?.name ?? "-"}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    disabled={updatingId === appointment.id}
                    onClick={() => setStatusTarget(appointment)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition disabled:opacity-60",
                      statusButtonClass(appointment.status),
                    )}
                    aria-label={`Alterar status de ${appointment.customer_name}`}
                  >
                    {updatingId === appointment.id ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <span className={cn("size-2 rounded-full", statusDot(appointment.status))} />
                    )}
                    {statusLabel(appointment.status)}
                    <ChevronDown size={14} className="opacity-70" aria-hidden="true" />
                  </button>
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  {formatCurrency(appointment.services?.price_cents ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={Boolean(statusTarget)}
        title="Alterar status"
        description={statusTarget ? `${statusTarget.customer_name} - ${formatDate(statusTarget.starts_at)}` : undefined}
        onClose={() => {
          if (!updatingId) setStatusTarget(null);
        }}
        className="max-w-xl"
      >
        {statusTarget ? (
          <div className="grid gap-3">
            {statusOptions.map((status) => {
              const active = statusTarget.status === status.value;
              return (
                <button
                  key={status.value}
                  type="button"
                  disabled={updatingId === statusTarget.id}
                  onClick={async () => {
                    const ok = await updateStatus(statusTarget.id, status.value);
                    if (ok) setStatusTarget(null);
                  }}
                  className={cn(
                    "flex min-h-16 items-center justify-between gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-60",
                    active
                      ? "border-brass bg-brass/12"
                      : "border-line bg-background/45 hover:border-brass/45 hover:bg-white/[0.035]",
                  )}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span className={cn("mt-1 size-2.5 rounded-full", statusDot(status.value))} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{status.label}</span>
                      <span className="mt-1 block text-sm leading-5 text-muted">{status.description}</span>
                    </span>
                  </span>
                  {active ? <Check size={18} className="shrink-0 text-brass" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-300",
    confirmed: "bg-brass",
    completed: "bg-emerald-300",
    cancelled: "bg-red-300",
    no_show: "bg-orange-300",
  };

  return map[status] ?? "bg-muted";
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? "Status";
}

function statusButtonClass(status: string) {
  const map: Record<string, string> = {
    pending: "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:border-amber-300/45",
    confirmed: "border-brass/35 bg-brass/12 text-foreground hover:border-brass/60",
    completed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/45",
    cancelled: "border-red-300/20 bg-red-300/10 text-red-100 hover:border-red-300/40",
    no_show: "border-orange-300/20 bg-orange-300/10 text-orange-100 hover:border-orange-300/40",
  };

  return map[status] ?? "border-line bg-smoke text-muted hover:border-brass/45";
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

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/state";
import { AdminPaginationButtons, clampPage, pageCount, pageSlice } from "@/components/admin/pagination-buttons";
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

const dashboardAppointmentPageSize = 8;

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
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  const totalPages = pageCount(visibleRows.length, dashboardAppointmentPageSize);
  const currentPage = clampPage(page, totalPages);
  const paginatedRows = pageSlice(visibleRows, currentPage, dashboardAppointmentPageSize);

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
    return true;
  }

  return (
    <div className="grid gap-3">
      <div className={cn("flex flex-col justify-between gap-3 sm:flex-row sm:items-center", compact && "hidden")}>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
          <input
            id="admin-appointments-table-search"
            name="admin_appointments_table_search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
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
            {paginatedRows.map((appointment) => (
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
                  <div className="relative inline-flex min-w-40 items-center">
                    {updatingId === appointment.id ? (
                      <Loader2
                        size={14}
                        className="pointer-events-none absolute left-3 animate-spin text-muted"
                        aria-hidden="true"
                      />
                    ) : null}
                    <select
                      value={appointment.status}
                      onChange={(event) => updateStatus(appointment.id, event.currentTarget.value as AppointmentStatus)}
                      disabled={updatingId === appointment.id}
                      className={cn(
                        "admin-status-select h-10 min-h-10 w-full appearance-none rounded-full border py-0 text-sm font-semibold outline-none transition disabled:opacity-60",
                        updatingId === appointment.id ? "pl-9 pr-9" : "pl-3.5 pr-9",
                        statusButtonClass(appointment.status),
                      )}
                      aria-label={`Alterar status de ${appointment.customer_name}`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 text-muted" aria-hidden="true" />
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  {formatCurrency(appointment.services?.price_cents ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPaginationButtons
        currentPage={currentPage}
        totalPages={totalPages}
        label="agendamentos do dashboard"
        onPageChange={setPage}
      />
    </div>
  );
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

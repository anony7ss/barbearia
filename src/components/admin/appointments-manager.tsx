"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarPlus, ChevronDown, Loader2, Pencil, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { cn, formatCurrency } from "@/lib/utils";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

type AppointmentRow = {
  id: string;
  service_id: string;
  barber_id: string;
  user_id?: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus | string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  services?: { name: string; price_cents: number; duration_minutes?: number } | null;
  barbers?: { name: string } | null;
};

type ServiceOption = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
};

type BarberOption = {
  id: string;
  name: string;
};

type ClientOption = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type StatusHistory = {
  id: string;
  appointment_id: string;
  previous_status: string | null;
  next_status: string;
  reason: string | null;
  created_at: string;
};

const statusOptions: Array<{ value: AppointmentStatus; label: string; description: string }> = [
  { value: "pending", label: "Pendente", description: "Aguardando confirmacao." },
  { value: "confirmed", label: "Confirmado", description: "Horario reservado." },
  { value: "completed", label: "Concluido", description: "Atendimento finalizado." },
  { value: "cancelled", label: "Cancelado", description: "Horario cancelado." },
  { value: "no_show", label: "No-show", description: "Cliente nao compareceu." },
];

export function AppointmentsManager({
  initialAppointments,
  services,
  barbers,
  clients,
  statusHistory,
}: {
  initialAppointments: AppointmentRow[];
  services: ServiceOption[];
  barbers: BarberOption[];
  clients: ClientOption[];
  statusHistory: StatusHistory[];
}) {
  const [rows, setRows] = useState(initialAppointments);
  const [history, setHistory] = useState(statusHistory);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [barberFilter, setBarberFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (barberFilter !== "all" && row.barber_id !== barberFilter) return false;
      if (serviceFilter !== "all" && row.service_id !== serviceFilter) return false;

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

      return !term || text.includes(term);
    });
  }, [barberFilter, query, rows, serviceFilter, statusFilter]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = appointmentPayload(new FormData(event.currentTarget), services);
    const response = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel criar o agendamento. Verifique disponibilidade e dados.");
      return;
    }

    const data = await response.json();
    setRows((current) => [hydrateAppointment(data.appointment, services, barbers), ...current]);
    setCreateOpen(false);
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAppointment) return;

    setError(null);
    setSubmitting(true);

    const payload = appointmentPayload(new FormData(event.currentTarget), services);
    const response = await fetch(`/api/admin/appointments/${editingAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel salvar o agendamento. Verifique disponibilidade e dados.");
      return;
    }

    const data = await response.json();
    const next = hydrateAppointment(data.appointment, services, barbers);
    setRows((current) => current.map((row) => (row.id === editingAppointment.id ? next : row)));
    appendLocalHistory(editingAppointment, next);
    setEditingAppointment(null);
  }

  async function updateStatus(row: AppointmentRow, status: AppointmentStatus) {
    setError(null);
    setUpdatingId(row.id);

    const response = await fetch(`/api/admin/appointments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setUpdatingId(null);

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status.");
      return false;
    }

    const data = await response.json();
    const next = hydrateAppointment(data.appointment, services, barbers);
    setRows((current) => current.map((item) => (item.id === row.id ? next : item)));
    appendLocalHistory(row, next);
    return true;
  }

  function appendLocalHistory(previous: AppointmentRow, next: AppointmentRow) {
    if (previous.status === next.status) return;
    setHistory((current) => [
      {
        id: `local-${Date.now()}`,
        appointment_id: next.id,
        previous_status: String(previous.status),
        next_status: String(next.status),
        reason: null,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.5rem] border border-line bg-smoke p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-xl font-semibold">Lista operacional</h2>
            <p className="mt-1 text-sm text-muted">Filtre, crie, edite, remarque e altere status sem sair da agenda.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCreateOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a]"
          >
            <CalendarPlus size={17} aria-hidden="true" />
            Novo agendamento
          </button>
        </div>

        <div className="admin-filter-grid mt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
            <input
              id="admin-appointment-search"
              name="admin_appointment_search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, telefone, servico ou barbeiro"
              className="field field-search w-full"
            />
          </div>
          <select
            id="admin-appointment-status-filter"
            name="admin_appointment_status_filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="field w-full"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select
            id="admin-appointment-barber-filter"
            name="admin_appointment_barber_filter"
            value={barberFilter}
            onChange={(event) => setBarberFilter(event.target.value)}
            className="field w-full"
            aria-label="Filtrar por barbeiro"
          >
            <option value="all">Todos os barbeiros</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>{barber.name}</option>
            ))}
          </select>
          <select
            id="admin-appointment-service-filter"
            name="admin_appointment_service_filter"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="field w-full"
            aria-label="Filtrar por servico"
          >
            <option value="all">Todos os servicos</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {visibleRows.length ? (
        <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-smoke">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Horario</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Servico</th>
                <th className="px-4 py-3 font-semibold">Barbeiro</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-t border-line transition hover:bg-white/[0.025]">
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs">{formatDate(row.starts_at)}</p>
                    <p className="mt-1 font-mono text-[0.68rem] text-muted">{formatHour(row.ends_at)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{row.customer_name}</p>
                    <p className="mt-1 text-xs text-muted">{row.customer_phone}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{row.services?.name ?? "Servico"}</p>
                    <p className="mt-1 text-xs text-muted">{formatCurrency(row.services?.price_cents ?? 0)}</p>
                  </td>
                  <td className="px-4 py-4">{row.barbers?.name ?? "Barbeiro"}</td>
                  <td className="px-4 py-4">
                    <div className="relative inline-flex min-w-40 items-center">
                      {updatingId === row.id ? (
                        <Loader2
                          size={14}
                          className="pointer-events-none absolute left-3 animate-spin text-muted"
                          aria-hidden="true"
                        />
                      ) : null}
                      <select
                        value={row.status}
                        onChange={(event) => updateStatus(row, event.currentTarget.value as AppointmentStatus)}
                        disabled={updatingId === row.id}
                        className={cn(
                          "admin-status-select h-10 min-h-10 w-full appearance-none rounded-full border py-0 text-sm font-semibold outline-none transition disabled:opacity-60",
                          updatingId === row.id ? "pl-9 pr-9" : "pl-3.5 pr-9",
                          statusButtonClass(row.status),
                        )}
                        aria-label={`Alterar status de ${row.customer_name}`}
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
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingAppointment(row);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                      >
                        <Pencil size={15} aria-hidden="true" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum agendamento encontrado" description="Ajuste filtros ou crie um novo agendamento manual." />
      )}

      <AppointmentDialog
        open={createOpen}
        title="Novo agendamento"
        services={services}
        barbers={barbers}
        clients={clients}
        onClose={() => !submitting && setCreateOpen(false)}
        onSubmit={create}
        submitting={submitting}
      />

      <AppointmentDialog
        open={Boolean(editingAppointment)}
        title="Editar agendamento"
        appointment={editingAppointment}
        services={services}
        barbers={barbers}
        clients={clients}
        history={editingAppointment ? history.filter((entry) => entry.appointment_id === editingAppointment.id) : []}
        onClose={() => !submitting && setEditingAppointment(null)}
        onSubmit={update}
        submitting={submitting}
      />

    </div>
  );
}

function AppointmentDialog({
  open,
  title,
  appointment,
  services,
  barbers,
  clients,
  history = [],
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  appointment?: AppointmentRow | null;
  services: ServiceOption[];
  barbers: BarberOption[];
  clients: ClientOption[];
  history?: StatusHistory[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} title={title} description="Valide disponibilidade, atendimento e notas internas." onClose={onClose} className="max-w-4xl">
      <form key={appointment?.id ?? "new"} onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Cliente rapido">
            <select
              id="admin-appointment-client-prefill"
              name="admin_appointment_client_prefill"
              defaultValue=""
              className="field w-full"
              onChange={(event) => fillClient(event.currentTarget)}
            >
              <option value="">Preencher manualmente</option>
              {clients.map((client) => (
                <option key={client.id} value={`${client.full_name ?? ""}|${client.phone ?? ""}`}>
                  {client.full_name ?? "Sem nome"} - {client.phone ?? "sem telefone"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={appointment?.status ?? "confirmed"} className="field w-full">
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Nome">
            <input name="customer_name" required defaultValue={appointment?.customer_name ?? ""} className="field w-full" data-client-name />
          </Field>
          <Field label="Telefone">
            <input name="customer_phone" required defaultValue={appointment?.customer_phone ?? ""} className="field w-full" data-client-phone />
          </Field>
          <Field label="Email">
            <input name="customer_email" type="email" defaultValue={appointment?.customer_email ?? ""} className="field w-full" />
          </Field>
          <Field label="Servico">
            <select name="service_id" required defaultValue={appointment?.service_id ?? ""} className="field w-full">
              <option value="" disabled>Selecione</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes} min
                </option>
              ))}
            </select>
          </Field>
          <Field label="Barbeiro">
            <select name="barber_id" required defaultValue={appointment?.barber_id ?? ""} className="field w-full">
              <option value="" disabled>Selecione</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Data e hora">
            <input name="starts_at" type="datetime-local" required defaultValue={toDatetimeLocal(appointment?.starts_at)} className="field w-full" />
          </Field>
          <Field label="Observacao do cliente" className="md:col-span-2">
            <textarea name="notes" rows={3} defaultValue={appointment?.notes ?? ""} className="field min-h-24 w-full resize-none py-3" />
          </Field>
          <Field label="Notas internas" className="md:col-span-2">
            <textarea name="internal_notes" rows={4} defaultValue={appointment?.internal_notes ?? ""} className="field min-h-28 w-full resize-none py-3" />
          </Field>
        </div>

        {history.length ? (
          <div className="rounded-2xl border border-line bg-background/45 p-4">
            <p className="text-sm font-semibold">Historico de status</p>
            <div className="mt-3 grid gap-2">
              {history.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-sm text-muted">
                  <span>{entry.previous_status ?? "criado"}{" -> "}{entry.next_status}</span>
                  <time>{formatDate(entry.created_at)}</time>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55">
            Cancelar
          </button>
          <button disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-55">
            <CalendarPlus size={16} aria-hidden="true" />
            {submitting ? "Salvando..." : "Salvar agendamento"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function appointmentPayload(formData: FormData, services: ServiceOption[]) {
  const startsAt = new Date(String(formData.get("starts_at"))).toISOString();
  const service = services.find((item) => item.id === formData.get("service_id"));
  const endsAt = new Date(new Date(startsAt).getTime() + (service?.duration_minutes ?? 30) * 60 * 1000).toISOString();

  return {
    service_id: String(formData.get("service_id")),
    barber_id: String(formData.get("barber_id")),
    starts_at: startsAt,
    ends_at: endsAt,
    status: String(formData.get("status")) as AppointmentStatus,
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    customer_email: String(formData.get("customer_email") ?? "").trim(),
    customer_phone: String(formData.get("customer_phone") ?? "").replace(/\D/g, ""),
    notes: String(formData.get("notes") ?? "").trim(),
    internal_notes: String(formData.get("internal_notes") ?? "").trim(),
  };
}

function hydrateAppointment(row: AppointmentRow, services: ServiceOption[], barbers: BarberOption[]) {
  const service = services.find((item) => item.id === row.service_id);
  const barber = barbers.find((item) => item.id === row.barber_id);
  return {
    ...row,
    services: row.services ?? (service ? {
      name: service.name,
      price_cents: service.price_cents,
      duration_minutes: service.duration_minutes,
    } : null),
    barbers: row.barbers ?? (barber ? { name: barber.name } : null),
  };
}

function fillClient(select: HTMLSelectElement) {
  const [name, phone] = select.value.split("|");
  const form = select.form;
  if (!form) return;
  const nameInput = form.querySelector<HTMLInputElement>("[data-client-name]");
  const phoneInput = form.querySelector<HTMLInputElement>("[data-client-phone]");
  if (nameInput && name) nameInput.value = name;
  if (phoneInput && phone) phoneInput.value = phone;
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</span>
      {children}
    </label>
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

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
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

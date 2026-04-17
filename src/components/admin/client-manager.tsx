"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Download, Pencil, Search, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type ProfileRole = "client" | "barber" | "admin";

type ClientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: ProfileRole | string;
  loyalty_points: number;
  preferred_barber_id?: string | null;
  internal_notes?: string | null;
  is_active?: boolean;
  deleted_at?: string | null;
  created_at: string;
};

type BarberOption = {
  id: string;
  name: string;
};

const roles: Array<{ value: ProfileRole; label: string; description: string }> = [
  { value: "client", label: "Cliente", description: "Acesso apenas aos proprios agendamentos." },
  { value: "barber", label: "Barbeiro", description: "Perfil operacional para profissional da equipe." },
  { value: "admin", label: "Admin", description: "Acesso ao painel administrativo." },
];

export function ClientManager({
  initialClients,
  barbers,
}: {
  initialClients: ClientRow[];
  barbers: BarberOption[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (roleFilter !== "all" && client.role !== roleFilter) return false;
      const text = [
        client.full_name,
        client.phone,
        client.role,
        String(client.loyalty_points),
        barbers.find((barber) => barber.id === client.preferred_barber_id)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !term || text.includes(term);
    });
  }, [barbers, clients, query, roleFilter]);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClient) return;

    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const preferredBarberId = String(formData.get("preferred_barber_id") ?? "") || null;
    const response = await fetch(`/api/admin/clients/${editingClient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        role: formData.get("role"),
        preferred_barber_id: preferredBarberId,
        loyalty_points: Number(formData.get("loyalty_points") || 0),
        internal_notes: String(formData.get("internal_notes") ?? "").trim(),
        is_active: formData.get("is_active") === "on",
        confirm_admin_role: formData.get("confirm_admin_role") === "on",
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel salvar o cliente.");
      return;
    }

    const payload = await response.json();
    setClients((current) => current.map((client) => (client.id === editingClient.id ? payload.client : client)));
    setEditingClient(null);
  }

  async function removeClient() {
    if (!deletingClient) return;

    setError(null);
    setSubmitting(true);

    const response = await fetch(`/api/admin/clients/${deletingClient.id}`, { method: "DELETE" });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel excluir o cliente. Verifique se nao e o proprio admin logado.");
      return;
    }

    setClients((current) => current.filter((client) => client.id !== deletingClient.id));
    setDeletingClient(null);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Base de clientes</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Perfis, roles e fidelidade.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Edite dados de contato, pontuacao, barbeiro preferido e permissao de acesso.
            </p>
          </div>
          <a
            href="/api/admin/clients/export"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
          >
            <Download size={17} aria-hidden="true" />
            Exportar CSV
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ClientStat icon={<UsersRound size={17} />} label="Total" value={clients.length} detail="perfis carregados" />
          <ClientStat icon={<ShieldCheck size={17} />} label="Admins" value={clients.filter((client) => client.role === "admin").length} detail="acesso administrativo" />
          <ClientStat icon={<UserRound size={17} />} label="Fidelidade" value={sumLoyalty(clients)} detail="pontos acumulados" />
        </div>
      </section>

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, telefone, role ou barbeiro"
            className="field field-search w-full"
          />
        </div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="field min-w-52">
          <option value="all">Todas as roles</option>
          {roles.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        <p className="text-sm text-muted">{visibleClients.length} de {clients.length} clientes</p>
      </div>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {visibleClients.length ? (
        <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-smoke">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Barbeiro preferido</th>
                <th className="px-4 py-3 font-semibold">Pontos</th>
                <th className="px-4 py-3 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => (
                <tr key={client.id} className="border-t border-line transition hover:bg-white/[0.025]">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{client.full_name ?? "Sem nome"}</p>
                    <p className="mt-1 font-mono text-[0.68rem] text-muted">{client.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-4">{client.phone || "-"}</td>
                  <td className="px-4 py-4">
                    <RoleBadge role={client.role} />
                  </td>
                  <td className="px-4 py-4">{barberName(client.preferred_barber_id, barbers)}</td>
                  <td className="px-4 py-4 font-semibold">{client.loyalty_points}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/clientes/${client.id}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                      >
                        <ArrowUpRight size={15} aria-hidden="true" />
                        Perfil
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingClient(client);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
                      >
                        <Pencil size={15} aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setDeletingClient(client);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-red-300/40 hover:text-red-100"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca para localizar perfis cadastrados." />
      )}

      <Dialog
        open={Boolean(editingClient)}
        title="Editar cliente"
        description="Altere dados operacionais, role, barbeiro preferido e pontos de fidelidade."
        onClose={() => {
          if (!submitting) setEditingClient(null);
        }}
        className="max-w-3xl"
      >
        {editingClient ? (
          <form key={editingClient.id} onSubmit={update} className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome">
                <input name="full_name" required defaultValue={editingClient.full_name ?? ""} className="field w-full" />
              </Field>
              <Field label="Telefone">
                <input name="phone" defaultValue={editingClient.phone ?? ""} className="field w-full" />
              </Field>
              <Field label="Role">
                <select name="role" required defaultValue={editingClient.role} className="field w-full">
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pontos de fidelidade">
                <input
                  name="loyalty_points"
                  type="number"
                  min="0"
                  defaultValue={editingClient.loyalty_points}
                  className="field w-full"
                />
              </Field>
              <Field label="Barbeiro preferido" className="md:col-span-2">
                <select name="preferred_barber_id" defaultValue={editingClient.preferred_barber_id ?? ""} className="field w-full">
                  <option value="">Sem preferencia</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notas internas" className="md:col-span-2">
                <textarea
                  name="internal_notes"
                  rows={4}
                  defaultValue={editingClient.internal_notes ?? ""}
                  placeholder="Preferencias, observacoes de atendimento, comportamento de no-show..."
                  className="field min-h-28 w-full resize-none py-3"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-line bg-background/45 p-4 text-sm">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={editingClient.is_active !== false}
                  className="mt-1 accent-[var(--brass)]"
                />
                <span>
                  <span className="block font-semibold">Perfil ativo</span>
                  <span className="mt-1 block text-muted">Desmarque para bloquear o perfil sem apagar historico.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/10 p-4 text-sm">
                <input
                  name="confirm_admin_role"
                  type="checkbox"
                  className="mt-1 accent-[var(--brass)]"
                />
                <span>
                  <span className="block font-semibold">Confirmo permissao admin</span>
                  <span className="mt-1 block text-muted">Obrigatorio ao promover um perfil para admin.</span>
                </span>
              </label>
            </div>

            <div className="grid gap-2">
              {roles.map((role) => (
                <div key={role.value} className="rounded-2xl border border-line bg-background/45 p-3">
                  <p className="font-semibold">{role.label}</p>
                  <p className="mt-1 text-sm text-muted">{role.description}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                disabled={submitting}
                className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55"
              >
                Cancelar
              </button>
              <button
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-55"
              >
                <Pencil size={16} aria-hidden="true" />
                {submitting ? "Salvando..." : "Salvar cliente"}
              </button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deletingClient)}
        title="Excluir cliente"
        description="Esta acao desativa o perfil e preserva historico operacional para auditoria."
        onClose={() => {
          if (!submitting) setDeletingClient(null);
        }}
        className="max-w-lg"
      >
        {deletingClient ? (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
              <p className="font-semibold text-red-100">{deletingClient.full_name ?? "Cliente sem nome"}</p>
              <p className="mt-1 text-sm text-muted">{deletingClient.phone || "Sem telefone"}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
                disabled={submitting}
                className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={removeClient}
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-300 px-5 text-sm font-bold text-ink transition hover:bg-red-200 disabled:opacity-55"
              >
                <Trash2 size={16} aria-hidden="true" />
                {submitting ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
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

function ClientStat({
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

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    admin: "border-brass/40 bg-brass/12 text-brass",
    barber: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    client: "border-line bg-background/45 text-muted",
  };

  return (
    <span className={cn("inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em]", classes[role] ?? classes.client)}>
      {roleLabel(role)}
    </span>
  );
}

function roleLabel(role: string) {
  return roles.find((item) => item.value === role)?.label ?? role;
}

function barberName(id: string | null | undefined, barbers: BarberOption[]) {
  if (!id) return "Sem preferencia";
  return barbers.find((barber) => barber.id === id)?.name ?? "Barbeiro removido";
}

function sumLoyalty(clients: ClientRow[]) {
  return clients.reduce((sum, client) => sum + Number(client.loyalty_points || 0), 0);
}

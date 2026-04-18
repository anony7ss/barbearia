"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, Pencil, Plus, Power, Search, Tag } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { AdminPaginationButtons, clampPage, pageCount, pageSlice } from "@/components/admin/pagination-buttons";
import { cn, formatCurrency } from "@/lib/utils";

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price_cents: number;
  is_active: boolean;
  display_order: number;
};

const servicePageSize = 8;

export function ServiceManager({ initialServices }: { initialServices: ServiceRow[] }) {
  const [services, setServices] = useState(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const activeServices = services.filter((service) => service.is_active).length;
  const averageTicket = services.length
    ? services.reduce((sum, service) => sum + service.price_cents, 0) / services.length
    : 0;

  const visibleServices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return services;

    return services.filter((service) => {
      const text = [service.name, service.slug, service.description, service.is_active ? "ativo" : "inativo"]
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [query, services]);

  const totalPages = pageCount(visibleServices.length, servicePageSize);
  const currentPage = clampPage(page, totalPages);
  const paginatedServices = pageSlice(visibleServices, currentPage, servicePageSize);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

    const response = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description: String(formData.get("description") ?? "").trim(),
        duration_minutes: Number(formData.get("duration_minutes")),
        buffer_minutes: Number(formData.get("buffer_minutes") || 0),
        price_cents: Math.round(Number(formData.get("price_reais")) * 100),
        display_order: Number(formData.get("display_order") || 0),
        is_active: true,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel criar o servico. Revise os campos e tente novamente.");
      return;
    }

    const payload = await response.json();
    setServices((current) => [payload.service, ...current]);
    form.reset();
    setDialogOpen(false);
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingService) return;

    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

    const response = await fetch(`/api/admin/services/${editingService.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description: String(formData.get("description") ?? "").trim(),
        duration_minutes: Number(formData.get("duration_minutes")),
        buffer_minutes: Number(formData.get("buffer_minutes") || 0),
        price_cents: Math.round(Number(formData.get("price_reais")) * 100),
        display_order: Number(formData.get("display_order") || 0),
        is_active: editingService.is_active,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel salvar as alteracoes do servico.");
      return;
    }

    const payload = await response.json();
    setServices((current) => current.map((item) => (item.id === editingService.id ? payload.service : item)));
    setEditingService(null);
  }

  async function setActive(id: string, isActive: boolean) {
    setError(null);
    setUpdatingId(id);

    const response = await fetch(`/api/admin/services/${id}`, {
      method: isActive ? "PATCH" : "DELETE",
      headers: isActive ? { "Content-Type": "application/json" } : undefined,
      body: isActive ? JSON.stringify({ is_active: true }) : undefined,
    });

    setUpdatingId(null);

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status do servico.");
      return;
    }

    setServices((current) => current.map((item) => (item.id === id ? { ...item, is_active: isActive } : item)));
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Catalogo</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Servicos que viram horarios vendaveis.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Configure preco, duracao e intervalo para manter a agenda precisa e sem conflitos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a]"
          >
            <Plus size={17} aria-hidden="true" />
            Novo servico
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ServiceStat icon={<Tag size={17} />} label="Ativos" value={activeServices} detail="disponiveis para agendar" />
          <ServiceStat icon={<Clock3 size={17} />} label="Duracao media" value={`${averageDuration(services)} min`} detail="inclui catalogo total" />
          <ServiceStat icon={<Tag size={17} />} label="Ticket medio" value={formatCurrency(averageTicket)} detail="valor por servico" />
        </div>
      </section>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
          <input
            id="admin-service-search"
            name="admin_service_search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, slug, descricao ou status"
            className="field field-search w-full"
          />
        </div>
        <p className="text-sm text-muted">{visibleServices.length} de {services.length} servicos</p>
      </div>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {visibleServices.length ? (
        <div className="grid gap-3">
          <section className="grid gap-4 xl:grid-cols-2">
            {paginatedServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                busy={updatingId === service.id}
                onEdit={setEditingService}
                onSetActive={setActive}
              />
            ))}
          </section>
          <AdminPaginationButtons
            currentPage={currentPage}
            totalPages={totalPages}
            label="servicos"
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState title="Nenhum servico encontrado" description="Ajuste a busca ou crie um novo servico para a agenda." />
      )}

      <Dialog
        open={dialogOpen}
        title="Novo servico"
        description="Defina preco, duracao e intervalo. Esses dados alimentam o calculo real de disponibilidade."
        onClose={() => {
          if (!submitting) setDialogOpen(false);
        }}
        className="max-w-3xl"
      >
        <form onSubmit={create} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome do servico">
              <input name="name" required placeholder="Corte executivo" className="field w-full" />
            </Field>
            <Field label="Slug publico">
              <input name="slug" placeholder="corte-executivo" className="field w-full" />
            </Field>
            <Field label="Duracao">
              <input name="duration_minutes" required type="number" min="10" max="240" placeholder="45" className="field w-full" />
            </Field>
            <Field label="Preco em R$">
              <input name="price_reais" required type="number" min="0" step="0.01" placeholder="95.00" className="field w-full" />
            </Field>
            <Field label="Intervalo apos atendimento">
              <input name="buffer_minutes" type="number" min="0" max="60" defaultValue="0" className="field w-full" />
            </Field>
            <Field label="Ordem de exibicao">
              <input name="display_order" type="number" min="0" defaultValue="0" className="field w-full" />
            </Field>
            <Field label="Descricao comercial" className="md:col-span-2">
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Corte consultivo com acabamento detalhado, finalizacao premium e orientacao de manutencao."
                className="field min-h-28 w-full resize-none py-3"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
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
              {submitting ? "Criando..." : "Criar servico"}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editingService)}
        title="Editar servico"
        description="Atualize preco, duracao, intervalo e texto comercial do servico."
        onClose={() => {
          if (!submitting) setEditingService(null);
        }}
        className="max-w-3xl"
      >
        {editingService ? (
          <form key={editingService.id} onSubmit={update} className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome do servico">
                <input name="name" required defaultValue={editingService.name} className="field w-full" />
              </Field>
              <Field label="Slug publico">
                <input name="slug" required defaultValue={editingService.slug} className="field w-full" />
              </Field>
              <Field label="Duracao">
                <input
                  name="duration_minutes"
                  required
                  type="number"
                  min="10"
                  max="240"
                  defaultValue={editingService.duration_minutes}
                  className="field w-full"
                />
              </Field>
              <Field label="Preco em R$">
                <input
                  name="price_reais"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(editingService.price_cents / 100).toFixed(2)}
                  className="field w-full"
                />
              </Field>
              <Field label="Intervalo apos atendimento">
                <input
                  name="buffer_minutes"
                  type="number"
                  min="0"
                  max="60"
                  defaultValue={editingService.buffer_minutes}
                  className="field w-full"
                />
              </Field>
              <Field label="Ordem de exibicao">
                <input
                  name="display_order"
                  type="number"
                  min="0"
                  defaultValue={editingService.display_order}
                  className="field w-full"
                />
              </Field>
              <Field label="Descricao comercial" className="md:col-span-2">
                <textarea
                  name="description"
                  required
                  rows={4}
                  defaultValue={editingService.description}
                  className="field min-h-28 w-full resize-none py-3"
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingService(null)}
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
                {submitting ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}

function ServiceCard({
  service,
  busy,
  onEdit,
  onSetActive,
}: {
  service: ServiceRow;
  busy: boolean;
  onEdit: (service: ServiceRow) => void;
  onSetActive: (id: string, isActive: boolean) => Promise<void>;
}) {
  return (
    <article className={cn("rounded-[1.5rem] border border-line bg-smoke p-5 transition hover:border-brass/45", !service.is_active && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-[-0.02em]">{service.name}</h3>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", service.is_active ? "border-emerald-300/25 text-emerald-100" : "border-line text-muted")}>
              {service.is_active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted">/{service.slug}</p>
        </div>
        <p className="text-2xl font-semibold text-brass">{formatCurrency(service.price_cents)}</p>
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{service.description}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Duracao" value={`${service.duration_minutes} min`} />
        <MiniStat label="Intervalo" value={`${service.buffer_minutes} min`} />
        <MiniStat label="Ordem" value={service.display_order} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Link
          href={`/agendamento?service=${service.slug}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
        >
          Abrir agenda
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => onEdit(service)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
        >
          <Pencil size={15} aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSetActive(service.id, !service.is_active)}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:opacity-55",
            service.is_active
              ? "border-line text-muted hover:border-red-300/40 hover:text-red-100"
              : "border-emerald-300/25 text-emerald-100 hover:border-emerald-300/50",
          )}
        >
          {service.is_active ? <Power size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
          {service.is_active ? "Desativar" : "Reativar"}
        </button>
      </div>
    </article>
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

function ServiceStat({
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function averageDuration(services: ServiceRow[]) {
  if (!services.length) return 0;
  const total = services.reduce((sum, service) => sum + Number(service.duration_minutes || 0), 0);
  return Math.round(total / services.length);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

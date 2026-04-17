"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type BarberRow = {
  id: string;
  profile_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  photo_url: string | null;
  rating: number;
  is_featured?: boolean;
  is_active: boolean;
  display_order: number;
};

type UserOption = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
};

export function BarberManager({
  initialBarbers,
  users,
}: {
  initialBarbers: BarberRow[];
  users: UserOption[];
}) {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<BarberRow | null>(null);
  const [deletingBarber, setDeletingBarber] = useState<BarberRow | null>(null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeBarbers = barbers.filter((barber) => barber.is_active).length;
  const featuredBarbers = barbers.filter((barber) => barber.is_featured).length;

  const visibleBarbers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return barbers;

    return barbers.filter((barber) => {
      const text = [barber.name, barber.slug, barber.bio, getSpecialties(barber).join(" "), barber.is_active ? "ativo" : "inativo"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [barbers, query]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
    const specialties = String(formData.get("specialties") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        bio: String(formData.get("bio") ?? "").trim(),
        specialties,
        photo_url: String(formData.get("photo_url") ?? "").trim(),
        profile_id: String(formData.get("profile_id") ?? "") || null,
        rating: Number(formData.get("rating") || 5),
        display_order: Number(formData.get("display_order") || 0),
        is_featured: formData.get("is_featured") === "on",
        is_active: true,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel criar o barbeiro. Revise os campos e tente novamente.");
      return;
    }

    const payload = await response.json();
    setBarbers((current) => [payload.barber, ...current]);
    form.reset();
    setDialogOpen(false);
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBarber) return;

    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
    const specialties = String(formData.get("specialties") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch(`/api/admin/barbers/${editingBarber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        bio: String(formData.get("bio") ?? "").trim(),
        specialties,
        photo_url: String(formData.get("photo_url") ?? "").trim(),
        profile_id: String(formData.get("profile_id") ?? "") || null,
        rating: Number(formData.get("rating") || 5),
        display_order: Number(formData.get("display_order") || 0),
        is_featured: formData.get("is_featured") === "on",
        is_active: editingBarber.is_active,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Nao foi possivel salvar as alteracoes do barbeiro.");
      return;
    }

    const payload = await response.json();
    setBarbers((current) => current.map((item) => (item.id === editingBarber.id ? payload.barber : item)));
    setEditingBarber(null);
  }

  async function setActive(id: string, isActive: boolean) {
    setError(null);
    setUpdatingId(id);

    const response = await fetch(`/api/admin/barbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });

    setUpdatingId(null);

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status do barbeiro.");
      return;
    }

    setBarbers((current) => current.map((item) => (item.id === id ? { ...item, is_active: isActive } : item)));
  }

  async function deleteBarber() {
    if (!deletingBarber) return;

    setError(null);
    setSubmitting(true);

    const response = await fetch(`/api/admin/barbers/${deletingBarber.id}`, {
      method: "DELETE",
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Nao foi possivel excluir o barbeiro.");
      setDeletingBarber(null);
      return;
    }

    setBarbers((current) => current.filter((item) => item.id !== deletingBarber.id));
    setDeletingBarber(null);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.5rem] border border-line bg-smoke/80 p-5">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Equipe</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Profissionais, agenda e vitrine publica.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Cadastre barbeiros, mantenha especialidades atualizadas e controle quem aparece no site.
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
            Novo barbeiro
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <TeamStat icon={<UserRound size={17} />} label="Ativos" value={activeBarbers} detail="aptos para agenda" />
          <TeamStat icon={<Sparkles size={17} />} label="Destaques" value={featuredBarbers} detail="prioridade na vitrine" />
          <TeamStat icon={<Star size={17} />} label="Nota media" value={averageRating(barbers)} detail="avaliacao publica" />
        </div>
      </section>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, slug, especialidade ou status"
            className="field field-search w-full"
          />
        </div>
        <p className="text-sm text-muted">{visibleBarbers.length} de {barbers.length} profissionais</p>
      </div>

      {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {visibleBarbers.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {visibleBarbers.map((barber) => (
            <BarberCard
              key={barber.id}
              barber={barber}
              busy={updatingId === barber.id}
              onEdit={setEditingBarber}
              onSetActive={setActive}
              onDelete={setDeletingBarber}
              linkedUserName={userName(barber.profile_id, users)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Nenhum barbeiro encontrado"
          description="Ajuste a busca ou crie um novo profissional para a equipe."
        />
      )}

      <Dialog
        open={dialogOpen}
        title="Novo barbeiro"
        description="Crie um perfil pronto para aparecer na equipe e receber agendamentos."
        onClose={() => {
          if (!submitting) setDialogOpen(false);
        }}
        className="max-w-3xl"
      >
        <form onSubmit={create} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome completo">
              <input name="name" required placeholder="Rafael Monteiro" className="field w-full" />
            </Field>
            <Field label="Slug publico">
              <input name="slug" placeholder="rafael-monteiro" className="field w-full" />
            </Field>
            <Field label="Especialidades">
              <input name="specialties" placeholder="Degrade, barba, social" className="field w-full" />
            </Field>
            <Field label="Avaliacao">
              <input name="rating" type="number" min="0" max="5" step="0.01" defaultValue="5" className="field w-full" />
            </Field>
            <Field label="URL da foto">
              <input name="photo_url" type="url" placeholder="https://images.unsplash.com/..." className="field w-full" />
            </Field>
            <Field label="Usuario vinculado">
              <select name="profile_id" defaultValue="" className="field w-full">
                <option value="">Sem usuario operacional</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {displayUser(user)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ordem de exibicao">
              <input name="display_order" type="number" min="0" defaultValue="0" className="field w-full" />
            </Field>
            <Field label="Bio curta" className="md:col-span-2">
              <textarea
                name="bio"
                rows={4}
                placeholder="Especialista em cortes precisos, acabamento limpo e atendimento consultivo."
                className="field min-h-28 w-full resize-none py-3"
              />
            </Field>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-line bg-background/45 p-4 text-sm">
            <input name="is_featured" type="checkbox" className="mt-1 accent-[var(--brass)]" />
            <span>
              <span className="block font-semibold">Destacar na vitrine publica</span>
              <span className="mt-1 block text-muted">Use para barbeiros mais procurados ou campanhas da semana.</span>
            </span>
          </label>

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
              {submitting ? "Criando..." : "Criar perfil"}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editingBarber)}
        title="Editar barbeiro"
        description="Atualize dados publicos, especialidades, foto e destaque sem perder historico."
        onClose={() => {
          if (!submitting) setEditingBarber(null);
        }}
        className="max-w-3xl"
      >
        {editingBarber ? (
          <form key={editingBarber.id} onSubmit={update} className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome completo">
                <input name="name" required defaultValue={editingBarber.name} className="field w-full" />
              </Field>
              <Field label="Slug publico">
                <input name="slug" required defaultValue={editingBarber.slug} className="field w-full" />
              </Field>
              <Field label="Especialidades">
                <input name="specialties" defaultValue={getSpecialties(editingBarber).join(", ")} className="field w-full" />
              </Field>
              <Field label="Avaliacao">
                <input name="rating" type="number" min="0" max="5" step="0.01" defaultValue={editingBarber.rating} className="field w-full" />
              </Field>
              <Field label="URL da foto">
                <input name="photo_url" type="url" defaultValue={editingBarber.photo_url ?? ""} className="field w-full" />
              </Field>
              <Field label="Usuario vinculado">
                <select name="profile_id" defaultValue={editingBarber.profile_id ?? ""} className="field w-full">
                  <option value="">Sem usuario operacional</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {displayUser(user)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ordem de exibicao">
                <input name="display_order" type="number" min="0" defaultValue={editingBarber.display_order} className="field w-full" />
              </Field>
              <Field label="Bio curta" className="md:col-span-2">
                <textarea
                  name="bio"
                  rows={4}
                  defaultValue={editingBarber.bio ?? ""}
                  className="field min-h-28 w-full resize-none py-3"
                />
              </Field>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-line bg-background/45 p-4 text-sm">
              <input
                name="is_featured"
                type="checkbox"
                defaultChecked={Boolean(editingBarber.is_featured)}
                className="mt-1 accent-[var(--brass)]"
              />
              <span>
                <span className="block font-semibold">Destacar na vitrine publica</span>
                <span className="mt-1 block text-muted">Use para barbeiros mais procurados ou campanhas da semana.</span>
              </span>
            </label>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingBarber(null)}
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

      <Dialog
        open={Boolean(deletingBarber)}
        title="Excluir barbeiro"
        description="A exclusao remove o perfil operacional e suas regras de disponibilidade. Se houver agendamentos vinculados, a acao sera bloqueada."
        onClose={() => {
          if (!submitting) setDeletingBarber(null);
        }}
        className="max-w-xl"
      >
        {deletingBarber ? (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
              <p className="font-semibold text-red-100">{deletingBarber.name}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/80">
                Para profissionais com historico, use desativar. Excluir so deve ser usado em cadastro criado por engano ou sem agenda vinculada.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingBarber(null)}
                disabled={submitting}
                className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-55"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteBarber}
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300/30 bg-red-300/10 px-5 text-sm font-bold text-red-100 transition hover:bg-red-300/20 disabled:opacity-55"
              >
                <Trash2 size={16} aria-hidden="true" />
                {submitting ? "Excluindo..." : "Excluir barbeiro"}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function BarberCard({
  barber,
  busy,
  onEdit,
  onSetActive,
  onDelete,
  linkedUserName,
}: {
  barber: BarberRow;
  busy: boolean;
  onEdit: (barber: BarberRow) => void;
  onSetActive: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (barber: BarberRow) => void;
  linkedUserName: string;
}) {
  const initials = getInitials(barber.name);
  const specialties = getSpecialties(barber);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-line bg-smoke transition hover:border-brass/45",
        !barber.is_active && "opacity-70",
      )}
    >
      <div className="grid gap-0 sm:grid-cols-[172px_minmax(0,1fr)]">
        <div className="relative min-h-44 border-b border-line bg-background sm:border-b-0 sm:border-r">
          {barber.photo_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${barber.photo_url}")` }}
              role="img"
              aria-label={`Foto de ${barber.name}`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid size-20 place-items-center rounded-full border border-brass/30 bg-brass/12 text-xl font-semibold text-brass">
                {initials}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 rounded-full border border-line bg-background/75 px-3 py-1 text-xs font-semibold backdrop-blur">
            {barber.is_active ? "Ativo" : "Inativo"}
          </div>
          {barber.is_featured ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-brass px-3 py-1 text-xs font-bold text-ink">
              <Sparkles size={13} aria-hidden="true" />
              Destaque
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 p-5">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{barber.name}</h3>
                <p className="mt-1 font-mono text-xs text-muted">/{barber.slug}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm font-semibold">
                <Star size={14} className="text-brass" aria-hidden="true" />
                {Number(barber.rating).toFixed(2)}
              </span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-muted">
              {barber.bio || "Perfil sem bio. Adicione uma descricao curta para fortalecer a pagina publica."}
            </p>
            <p className="mt-3 inline-flex rounded-full border border-line bg-background/45 px-3 py-1 text-xs text-muted">
              Acesso operacional: {linkedUserName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {specialties.length ? (
              specialties.map((specialty) => (
                <span key={specialty} className="rounded-full border border-line bg-background/45 px-3 py-1 text-xs text-muted">
                  {specialty}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted">
                <Camera size={13} aria-hidden="true" />
                Sem especialidades
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Link
              href={`/agendamento?barber=${barber.slug}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              Abrir agenda
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href={`/equipe/${barber.slug}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              Ver perfil
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => onEdit(barber)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
            >
              <Pencil size={15} aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetActive(barber.id, !barber.is_active)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:opacity-55",
                barber.is_active
                  ? "border-line text-muted hover:border-red-300/40 hover:text-red-100"
                  : "border-emerald-300/25 text-emerald-100 hover:border-emerald-300/50",
              )}
            >
              {barber.is_active ? <Power size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
              {barber.is_active ? "Desativar" : "Reativar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(barber)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300/25 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-55"
            >
              <Trash2 size={15} aria-hidden="true" />
              Excluir
            </button>
          </div>
        </div>
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

function TeamStat({
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

function averageRating(barbers: BarberRow[]) {
  if (!barbers.length) return "0.00";
  const total = barbers.reduce((sum, barber) => sum + Number(barber.rating || 0), 0);
  return (total / barbers.length).toFixed(2);
}

function getSpecialties(barber: Pick<BarberRow, "specialties">) {
  return Array.isArray(barber.specialties) ? barber.specialties : [];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function displayUser(user: UserOption) {
  const name = user.full_name || user.phone || user.id.slice(0, 8);
  return `${name} (${user.role})`;
}

function userName(id: string | null, users: UserOption[]) {
  if (!id) return "nao vinculado";
  const user = users.find((item) => item.id === id);
  return user ? displayUser(user) : "usuario removido";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

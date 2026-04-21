"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/ui/state";
import { type BarberGalleryItem } from "@/features/barbers/gallery-config";
import { cn } from "@/lib/utils";

type GalleryStudioProps = {
  endpointBase: string;
  title: string;
  description: string;
  initialItems?: BarberGalleryItem[];
  autoLoad?: boolean;
  variant?: "panel" | "dialog";
};

export function GalleryStudio({
  endpointBase,
  title,
  description,
  initialItems = [],
  autoLoad = false,
  variant = "panel",
}: GalleryStudioProps) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(autoLoad);
  const [submitting, setSubmitting] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!autoLoad) return;
    let mounted = true;
    setLoading(true);
    fetch(endpointBase)
      .then(async (response) => {
        if (!response.ok) throw new Error("gallery_load_failed");
        return response.json() as Promise<{ items: BarberGalleryItem[] }>;
      })
      .then((payload) => {
        if (mounted) {
          setItems(payload.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
          setMessage({ tone: "error", text: "Nao foi possivel carregar a galeria." });
        }
      });

    return () => {
      mounted = false;
    };
  }, [autoLoad, endpointBase]);

  const orderedIds = useMemo(() => items.map((item) => item.id), [items]);
  const coverCount = items.filter((item) => item.isCover).length;
  const activeCount = items.filter((item) => item.isActive).length;

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch(endpointBase, {
      method: "POST",
      body: formData,
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage({ tone: "error", text: payload?.error ?? "Nao foi possivel adicionar a imagem." });
      return;
    }

    const payload = (await response.json()) as { item: BarberGalleryItem };
    setItems((current) => normalizeGallery([...current, payload.item]));
    form.reset();
    setMessage({ tone: "success", text: "Imagem adicionada na galeria." });
  }

  async function reorder(itemId: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    setItems(normalizeGallery(next));
    setBusyItemId(itemId);

    const response = await fetch(`${endpointBase}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: next.map((item) => item.id) }),
    });

    setBusyItemId(null);

    if (!response.ok) {
      setItems(normalizeGallery(items));
      setMessage({ tone: "error", text: "Nao foi possivel salvar a nova ordem." });
      return;
    }

    const payload = (await response.json()) as { items: BarberGalleryItem[] };
    setItems(payload.items);
  }

  async function patchItem(itemId: string, body: Record<string, boolean>) {
    setBusyItemId(itemId);
    setMessage(null);

    const response = await fetch(`${endpointBase}/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setBusyItemId(null);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage({ tone: "error", text: payload?.error ?? "Nao foi possivel atualizar a imagem." });
      return;
    }

    const payload = (await response.json()) as { item: BarberGalleryItem };
    setItems((current) => normalizeGallery(current.map((item) => (item.id === itemId ? payload.item : item))));
  }

  async function removeItem(itemId: string) {
    setBusyItemId(itemId);
    setMessage(null);

    const response = await fetch(`${endpointBase}/${itemId}`, {
      method: "DELETE",
    });

    setBusyItemId(null);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage({ tone: "error", text: payload?.error ?? "Nao foi possivel excluir a imagem." });
      return;
    }

    setItems((current) => normalizeGallery(current.filter((item) => item.id !== itemId)));
  }

  return (
    <section
      className={cn(
        "grid gap-5",
        variant === "panel" && "rounded-[1.75rem] border border-line bg-smoke p-5",
      )}
    >
      <div className={cn("grid gap-3", variant === "panel" ? "xl:grid-cols-[0.78fr_0.22fr]" : "lg:grid-cols-[0.78fr_0.22fr]")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Galeria viva por barbeiro.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <StudioMetric label="Ativas" value={activeCount} />
          <StudioMetric label="Capas" value={coverCount} />
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-2xl border p-3 text-sm",
            message.tone === "success"
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-red-300/25 bg-red-300/10 text-red-100",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <form
        onSubmit={upload}
        className={cn(
          "grid gap-4 rounded-[1.35rem] border border-line bg-background/45 p-4",
          variant === "panel" ? "lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_auto]",
        )}
      >
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Upload da imagem
            <div className="rounded-2xl border border-dashed border-line bg-background/55 p-4">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl bg-brass text-ink">
                <Upload size={18} aria-hidden="true" />
              </div>
              <input
                id={`${endpointBase}-gallery-file`}
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brass file:px-4 file:py-2 file:font-semibold file:text-ink"
              />
              <p className="mt-3 text-xs text-muted">JPG, PNG ou WebP ate 5 MB. Nao envie SVG.</p>
            </div>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Ou use uma URL HTTPS
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} aria-hidden="true" />
              <input
                name="external_url"
                type="url"
                placeholder="https://..."
                className="field field-search w-full pl-10"
              />
            </div>
          </label>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Descricao curta
            <input name="caption" maxLength={240} className="field w-full" placeholder="Fade classico com acabamento limpo" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Texto alternativo
            <input name="alt_text" maxLength={180} className="field w-full" placeholder="Cliente com corte degradê e barba desenhada" />
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-line bg-background/55 p-3 text-sm text-muted">
            <input name="is_cover" type="checkbox" value="true" className="mt-1 accent-[var(--brass)]" />
            <span>
              <span className="block font-semibold text-foreground">Usar como destaque</span>
              <span className="mt-1 block text-xs leading-5">A capa aparece primeiro no portfolio do barbeiro.</span>
            </span>
          </label>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d6ad6a] disabled:opacity-55"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
            {submitting ? "Enviando..." : "Adicionar imagem"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="rounded-[1.35rem] border border-line bg-background/45 p-5 text-sm text-muted">Carregando galeria...</div>
      ) : items.length ? (
        <div className={cn("grid gap-4", variant === "panel" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
          {items.map((item, index) => (
            <article
              key={item.id}
              className={cn(
                "overflow-hidden rounded-[1.35rem] border border-line bg-background/55 transition",
                !item.isActive && "opacity-60",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.altText ?? item.caption ?? "Imagem da galeria"}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
                  {item.isCover ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brass px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink">
                      <Star size={13} aria-hidden="true" />
                      Capa
                    </span>
                  ) : null}
                  <span className="rounded-full border border-line bg-background/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted backdrop-blur">
                    #{index + 1}
                  </span>
                </div>
              </div>
              <div className="grid gap-4 p-4">
                <div>
                  <p className="font-semibold text-foreground">{item.caption ?? "Sem descricao"}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{item.altText ?? "Sem texto alternativo."}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyItemId === item.id || index === 0}
                    onClick={() => reorder(item.id, -1)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-35"
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                    Subir
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id || index === items.length - 1}
                    onClick={() => reorder(item.id, 1)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-35"
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                    Descer
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id || item.isCover}
                    onClick={() => patchItem(item.id, { isCover: true })}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition disabled:opacity-35",
                      item.isCover
                        ? "border-brass bg-brass text-ink"
                        : "border-line text-muted hover:border-brass hover:text-foreground",
                    )}
                  >
                    <Star size={14} aria-hidden="true" />
                    {item.isCover ? "Capa" : "Definir capa"}
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => patchItem(item.id, { isActive: !item.isActive })}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground disabled:opacity-35"
                  >
                    {item.isActive ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                    {item.isActive ? "Ocultar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => removeItem(item.id)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300/25 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-300/10 disabled:opacity-35"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma imagem na galeria"
          description="Suba arquivos reais ou registre URLs HTTPS para montar o portfolio do barbeiro."
          className="bg-background/35"
        />
      )}
    </section>
  );
}

function normalizeGallery(items: BarberGalleryItem[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt));
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.1rem] border border-line bg-background/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

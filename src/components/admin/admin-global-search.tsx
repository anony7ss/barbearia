"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminSearchResult = {
  id: string;
  type: "Painel" | "Atalho" | "Cliente" | "Agendamento" | "Servico" | "Barbeiro";
  title: string;
  detail: string;
  href: string;
};

type AdminSearchResponse = {
  results?: AdminSearchResult[];
  error?: string;
};

const shortcuts: AdminSearchResult[] = [
  {
    id: "shortcut-agenda",
    type: "Painel",
    title: "Agenda operacional",
    detail: "buscar atendimentos, status e horarios",
    href: "/admin/agenda",
  },
  {
    id: "shortcut-clientes",
    type: "Painel",
    title: "Base de clientes",
    detail: "perfis, roles, telefone e historico",
    href: "/admin/clientes",
  },
  {
    id: "shortcut-servicos",
    type: "Painel",
    title: "Catalogo de servicos",
    detail: "precos, duracao e status",
    href: "/admin/servicos",
  },
  {
    id: "shortcut-disponibilidade",
    type: "Painel",
    title: "Disponibilidade",
    detail: "bloqueios, folgas, ferias e horarios",
    href: "/admin/disponibilidade",
  },
];

export function AdminGlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function search(value: string) {
    setQuery(value);
    setOpen(true);
    setError(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as AdminSearchResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Falha ao buscar.");
        }

        setResults(payload.results ?? []);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(requestError instanceof Error ? requestError.message : "Falha ao buscar.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
  }

  function closeSearch() {
    setOpen(false);
  }

  const visibleItems = query.trim().length >= 2 ? results : shortcuts;

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeSearch();
        }
      }}
    >
      <label htmlFor="admin-global-search" className="sr-only">
        Buscar no painel admin
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
        <input
          id="admin-global-search"
          name="admin_global_search"
          value={query}
          onChange={(event) => search(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeSearch();
          }}
          autoComplete="off"
          placeholder="Buscar perfis, abas, horarios, status, servicos..."
          className="h-11 w-full rounded-full border border-line bg-background/62 pl-10 pr-11 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted hover:border-brass/45 focus:border-brass focus:bg-background"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-brass" size={16} aria-hidden="true" />
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 overflow-hidden rounded-[1.25rem] border border-line bg-[#12110f]/98 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-xl">
          {error ? (
            <p className="px-3 py-3 text-sm text-muted">{error}</p>
          ) : visibleItems.length ? (
            <div className="grid max-h-[22rem] gap-1 overflow-y-auto">
              {visibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    closeSearch();
                  }}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white/[0.055]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="rounded-full border border-brass/25 bg-brass/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brass">
                        {item.type}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted">{item.detail}</span>
                  </span>
                  <ArrowUpRight className="shrink-0 text-muted transition group-hover:text-brass" size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-sm text-muted">Nenhum resultado encontrado.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

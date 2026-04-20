"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Bell,
  Clock3,
  FileText,
  Gauge,
  Home,
  LogOut,
  Mail,
  Menu,
  Scissors,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/site/brand-mark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", detail: "Visao geral", icon: Gauge },
  { href: "/admin/agenda", label: "Agenda", detail: "Atendimentos", icon: CalendarDays },
  { href: "/admin/servicos", label: "Servicos", detail: "Precos e duracao", icon: Scissors },
  { href: "/admin/barbeiros", label: "Barbeiros", detail: "Equipe", icon: UserRound },
  { href: "/admin/clientes", label: "Clientes", detail: "Historico", icon: UsersRound },
  { href: "/admin/disponibilidade", label: "Disponibilidade", detail: "Escalas e bloqueios", icon: Clock3 },
  { href: "/admin/relatorios", label: "Relatorios", detail: "Filtros e periodo", icon: FileText },
  { href: "/admin/contato", label: "Contato", detail: "Mensagens e resposta", icon: Mail },
  { href: "/admin/notificacoes", label: "Notificacoes", detail: "Emails e cron", icon: Bell },
  { href: "/admin/configuracoes", label: "Configuracoes", detail: "Regras gerais", icon: Settings2 },
  { href: "/admin/auditoria", label: "Auditoria", detail: "Logs e seguranca", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const saved = window.localStorage.getItem("sidebarclose");
      if (saved === "true" || saved === "false") {
        return saved === "true";
      }
      window.localStorage.setItem("sidebarclose", "false");
    } catch {
      // localStorage can be unavailable in restricted browsers.
    }
    return false;
  });

  function toggleDesktopSidebar() {
    setDesktopCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem("sidebarclose", String(next));
      } catch {
        // Keep the UI usable even if persistence fails.
      }
      return next;
    });
  }

  return (
    <div className={cn("admin-shell min-h-screen bg-[#0b0a09] text-foreground", desktopCollapsed && "admin-shell-collapsed")}>
      <aside className="admin-sidebar border-line bg-[#11100e]/95 backdrop-blur-xl">
        <div className="admin-sidebar-top flex items-center justify-between gap-3">
          <Link
            href="/"
            className="admin-sidebar-brand inline-flex items-center gap-3 px-1 lg:rounded-[1.25rem] lg:border lg:border-line lg:bg-background/35 lg:p-3 lg:transition lg:hover:border-brass/45"
            title="Voltar para a pagina inicial"
          >
            <BrandMark compact />
            <span className="admin-sidebar-label">
              <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
                Corte Nobre
              </span>
              <span className="mt-1 block text-xs text-muted">Admin studio</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-brass hover:text-foreground lg:hidden"
            aria-label="Voltar ao site"
          >
            <Home size={18} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-brass hover:text-foreground lg:hidden"
            aria-label="Abrir navegacao admin"
          >
            {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:border-brass hover:text-foreground lg:flex"
            aria-label={desktopCollapsed ? "Expandir sidebar admin" : "Fechar sidebar admin"}
            aria-expanded={!desktopCollapsed}
            title={desktopCollapsed ? "Expandir sidebar" : "Fechar sidebar"}
          >
            {desktopCollapsed ? <Menu size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
          </button>
        </div>

        <div className={cn("admin-sidebar-card mt-6 rounded-[1.25rem] border border-line bg-background/55 p-4", !mobileOpen && "hidden lg:block")}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Operacao</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Agenda, equipe e servicos em uma area administrativa direta.
          </p>
        </div>

        <nav className={cn("mt-6 gap-2 px-1", mobileOpen ? "grid" : "hidden lg:grid")} aria-label="Navegacao admin">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "admin-nav-link group flex min-h-14 items-center gap-3 rounded-[1rem] px-3.5 text-sm transition lg:rounded-[1.1rem]",
                  active
                    ? "bg-brass text-ink shadow-[0_18px_55px_rgba(193,150,85,0.18)]"
                    : "text-muted lg:border lg:border-transparent hover:bg-white/[0.055] hover:text-foreground lg:hover:border-line",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition",
                    active ? "border-ink/15 bg-ink/10" : "border-line bg-background/50 group-hover:border-brass/40",
                  )}
                >
                  <item.icon size={17} aria-hidden="true" />
                </span>
                <span className="admin-sidebar-label min-w-0">
                  <span className="block truncate font-semibold">{item.label}</span>
                  <span className={cn("block truncate text-xs", active ? "text-ink/68" : "text-muted")}>
                    {item.detail}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-8 lg:block">
          <div className="grid gap-2">
            <Link
              href="/"
              title="Ver site"
              className="admin-sidebar-footer-link flex min-h-11 items-center gap-3 rounded-[1rem] px-3 text-sm text-muted transition hover:bg-white/[0.055] hover:text-foreground"
            >
              <Home size={17} aria-hidden="true" />
              <span className="admin-sidebar-label">Ver site</span>
            </Link>
            <SignOutButton className="admin-sidebar-footer-link flex min-h-11 items-center gap-3 rounded-[1rem] px-3 text-sm text-muted transition hover:bg-white/[0.055] hover:text-foreground disabled:opacity-60">
              <LogOut size={17} aria-hidden="true" />
              <span className="admin-sidebar-label">Sair</span>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <div className="admin-main min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-[#0b0a09]/82 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Painel administrativo</p>
                <p className="mt-1 text-sm text-muted">Controle operacional da barbearia</p>
              </div>
              <AdminGlobalSearch className="w-full lg:w-[min(42vw,560px)] xl:w-[560px]" />
            </div>
            <Link
              href="/admin/configuracoes"
              className="hidden min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground sm:inline-flex"
            >
              <Settings2 size={16} aria-hidden="true" />
              Ajustes
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

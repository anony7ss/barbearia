"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Bell,
  Clock3,
  Gauge,
  Home,
  LogOut,
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
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", detail: "Visao geral", icon: Gauge },
  { href: "/admin/agenda", label: "Agenda", detail: "Atendimentos", icon: CalendarDays },
  { href: "/admin/servicos", label: "Servicos", detail: "Precos e duracao", icon: Scissors },
  { href: "/admin/barbeiros", label: "Barbeiros", detail: "Equipe", icon: UserRound },
  { href: "/admin/clientes", label: "Clientes", detail: "Historico", icon: UsersRound },
  { href: "/admin/disponibilidade", label: "Disponibilidade", detail: "Escalas e bloqueios", icon: Clock3 },
  { href: "/admin/notificacoes", label: "Notificacoes", detail: "Emails e cron", icon: Bell },
  { href: "/admin/configuracoes", label: "Configuracoes", detail: "Regras gerais", icon: Settings2 },
  { href: "/admin/auditoria", label: "Auditoria", detail: "Logs e seguranca", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen bg-[#0b0a09] text-foreground">
      <aside className="admin-sidebar border-line bg-[#11100e]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="inline-flex items-center gap-3 px-1">
            <BrandMark compact />
            <span>
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
        </div>

        <div className={cn("mt-6 rounded-[1.25rem] border border-line bg-background/55 p-4", !mobileOpen && "hidden lg:block")}>
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
                className={cn(
                  "group flex min-h-14 items-center gap-3 rounded-[1rem] px-3.5 text-sm transition",
                  active
                    ? "bg-brass text-ink shadow-[0_18px_55px_rgba(193,150,85,0.18)]"
                    : "text-muted hover:bg-white/[0.055] hover:text-foreground",
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
                <span className="min-w-0">
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
              className="flex min-h-11 items-center gap-3 rounded-[1rem] px-3 text-sm text-muted transition hover:bg-white/[0.055] hover:text-foreground"
            >
              <Home size={17} aria-hidden="true" />
              Ver site
            </Link>
            <SignOutButton className="flex min-h-11 items-center gap-3 rounded-[1rem] px-3 text-sm text-muted transition hover:bg-white/[0.055] hover:text-foreground disabled:opacity-60">
              <LogOut size={17} aria-hidden="true" />
              Sair
            </SignOutButton>
          </div>
        </div>
      </aside>

      <div className="admin-main min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-[#0b0a09]/82 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Painel administrativo</p>
              <p className="mt-1 text-sm text-muted">Controle operacional da barbearia</p>
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

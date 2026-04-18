"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { CalendarClock, ChevronDown, LogOut, Menu, Settings2, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button-link";
import { createSupabaseBrowserClient } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/site/brand-mark";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems = [
  { href: "/servicos", label: "Servicos" },
  { href: "/equipe", label: "Equipe" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
  { href: "/meus-agendamentos", label: "Meus horarios" },
];

export type NavbarProps = {
  initialIsAuthenticated?: boolean;
  initialIsAdmin?: boolean;
  initialIsBarber?: boolean;
  initialUserName?: string | null;
  initialUserEmail?: string | null;
};

export function Navbar({
  initialIsAuthenticated = false,
  initialIsAdmin = false,
  initialIsBarber = false,
  initialUserName = null,
  initialUserEmail = null,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [isBarber, setIsBarber] = useState(initialIsBarber);
  const [userName, setUserName] = useState(initialUserName);
  const [userEmail, setUserEmail] = useState(initialUserEmail);
  const displayName = userName?.trim() || userEmail?.split("@")[0] || "Minha conta";

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = createSupabaseBrowserClient();
      const applyUserState = async (user: User | null) => {
        if (!mounted) return;

        setIsAuthenticated(Boolean(user));

        if (!user) {
          setIsAdmin(false);
          setIsBarber(false);
          setUserName(null);
          setUserEmail(null);
          return;
        }

        setUserEmail(user.email ?? null);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, is_active, deleted_at")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        setIsAdmin(isActiveAdminProfile(profile));
        setIsBarber(isActiveBarberProfile(profile));
        setUserName(profile?.full_name ?? user.user_metadata?.full_name ?? null);
      };

      supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
        await applyUserState(data.session?.user ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
        if (!mounted) return;

        await applyUserState(session?.user ?? null);

        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          return;
        }

        if (event === "SIGNED_OUT") {
          setMenuOpen(false);
          setOpen(false);
          router.refresh();
          return;
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          router.refresh();
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      // Keep the server-rendered initial auth state if the browser client is unavailable.
    }

    return () => {
      mounted = false;
    };
  }, [initialIsAdmin, initialIsAuthenticated, initialIsBarber, initialUserEmail, initialUserName, router]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="glass-line flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold"
          aria-label="Corte Nobre - pagina inicial"
        >
          <BrandMark compact />
          <span className="hidden tracking-[0.22em] sm:inline">CORTE NOBRE</span>
        </Link>

        <nav
          className="glass-line hidden items-center gap-1 rounded-full px-2 py-2 lg:flex"
          aria-label="Navegacao principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm text-muted transition hover:bg-white/8 hover:text-foreground",
                pathname === item.href && "bg-white/10 text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className={cn(
                  "group flex h-11 items-center gap-2 rounded-full border border-line bg-background/72 py-1 pl-1 pr-3 text-sm backdrop-blur-xl transition hover:border-brass/50 hover:bg-smoke focus-visible:outline-brass",
                  menuOpen && "border-brass/55 bg-smoke",
                )}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass text-sm font-bold text-ink">
                  {initials(userName ?? userEmail ?? "CN")}
                </span>
                <span className="max-w-28 truncate font-semibold leading-none text-foreground">
                  {displayName}
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={cn("shrink-0 text-muted transition duration-200 group-hover:text-foreground", menuOpen && "rotate-180")}
                />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-64 rounded-[1.25rem] border border-line bg-smoke p-2 shadow-[0_24px_90px_rgba(0,0,0,0.42)]"
                >
                  <div className="mb-1 border-b border-line px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{userName ?? "Cliente Corte Nobre"}</p>
                      <p className="mt-1 truncate text-xs text-muted">{userEmail}</p>
                    </div>
                    {isAdmin ? (
                      <span className="mt-3 inline-flex rounded-full border border-brass/35 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass">
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <DropdownLink href="/meus-agendamentos" icon={<UserRound size={16} />}>
                    Minha agenda
                  </DropdownLink>
                  <DropdownLink href="/preferencias" icon={<Settings2 size={16} />}>
                    Preferencias
                  </DropdownLink>
                  {isAdmin ? (
                    <DropdownLink href="/admin" icon={<ShieldCheck size={16} />}>
                      Painel admin
                    </DropdownLink>
                  ) : null}
                  {isBarber ? (
                    <DropdownLink href="/barbeiro" icon={<CalendarClock size={16} />}>
                      Minha agenda profissional
                    </DropdownLink>
                  ) : null}
                  <SignOutButton className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm text-muted transition hover:bg-white/8 hover:text-foreground disabled:opacity-60">
                    <LogOut size={16} />
                    Sair
                  </SignOutButton>
                </div>
              ) : null}
            </div>
          ) : (
            <ButtonLink href="/login" variant="ghost" icon={false}>
              Entrar
            </ButtonLink>
          )}
          <ButtonLink href="/agendamento">Agendar</ButtonLink>
        </div>

        <button
          type="button"
          className="glass-line flex h-12 w-12 items-center justify-center rounded-full lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="mx-4 rounded-3xl border border-line bg-smoke/96 p-4 shadow-2xl lg:hidden">
          <nav className="grid gap-2" aria-label="Navegacao mobile">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/86 hover:bg-white/8"
              >
                {item.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {isAuthenticated ? (
                <>
                  <ButtonLink href="/meus-agendamentos" variant="secondary" icon={false}>
                    Minha agenda
                  </ButtonLink>
                  <ButtonLink href="/preferencias" variant="secondary" icon={false}>
                    Preferencias
                  </ButtonLink>
                  <SignOutButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-white/8 px-5 text-sm font-semibold text-foreground transition duration-200 hover:border-brass/70 hover:bg-white/12 disabled:opacity-60">
                    Sair
                  </SignOutButton>
                  {isBarber ? (
                    <ButtonLink href="/barbeiro" variant="secondary" icon={false}>
                      Agenda profissional
                    </ButtonLink>
                  ) : null}
                </>
              ) : (
                <ButtonLink href="/login" variant="secondary" icon={false}>
                  Entrar
                </ButtonLink>
              )}
              <ButtonLink href="/agendamento">Agendar</ButtonLink>
            </div>
            {isAuthenticated && isAdmin ? (
              <ButtonLink href="/admin" variant="secondary" icon={false}>
                Admin
              </ButtonLink>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function DropdownLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm text-muted transition hover:bg-white/8 hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}

function initials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isActiveAdminProfile(
  profile: { role?: string | null; is_active?: boolean | null; deleted_at?: string | null } | null | undefined,
) {
  return profile?.role === "admin" && profile.is_active === true && profile.deleted_at === null;
}

function isActiveBarberProfile(
  profile: { role?: string | null; is_active?: boolean | null; deleted_at?: string | null } | null | undefined,
) {
  return profile?.role === "barber" && profile.is_active === true && profile.deleted_at === null;
}

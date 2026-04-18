import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPaginationLinks({
  currentPage,
  totalPages,
  label,
  hrefForPage,
  className,
}: {
  currentPage: number;
  totalPages: number;
  label: string;
  hrefForPage: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const previousPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);

  return (
    <nav
      className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between", className)}
      aria-label={`Paginacao de ${label}`}
    >
      <p className="text-sm text-muted">
        Pagina <span className="font-semibold text-foreground">{currentPage}</span> de{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <PageLink href={hrefForPage(previousPage)} disabled={currentPage <= 1} label="Anterior">
          <ChevronLeft size={15} aria-hidden="true" />
          Anterior
        </PageLink>
        <PageLink href={hrefForPage(nextPage)} disabled={currentPage >= totalPages} label="Proxima">
          Proxima
          <ChevronRight size={15} aria-hidden="true" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted opacity-45"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-brass hover:text-foreground"
    >
      {children}
    </Link>
  );
}

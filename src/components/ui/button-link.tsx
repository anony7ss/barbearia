import Link from "next/link";
import type { ComponentProps } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost";
  icon?: boolean;
};

export function ButtonLink({
  className,
  variant = "primary",
  icon = true,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition duration-200",
        variant === "primary" &&
          "bg-brass text-ink shadow-[0_18px_60px_rgba(193,150,85,0.25)] hover:bg-[#d4aa68]",
        variant === "secondary" &&
          "border border-line bg-white/8 text-foreground hover:border-brass/70 hover:bg-white/12",
        variant === "ghost" &&
          "text-foreground/86 hover:bg-white/8 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {icon ? <ArrowRight aria-hidden="true" size={16} /> : null}
    </Link>
  );
}

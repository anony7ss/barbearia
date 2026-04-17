import { cn } from "@/lib/utils";

export function PremiumBadge({
  children,
  tone = "dark",
  className,
}: {
  children: React.ReactNode;
  tone?: "dark" | "light" | "gold";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.22em]",
        tone === "dark" && "border-brass/35 bg-brass/10 text-brass",
        tone === "light" && "border-ink/10 bg-ink/[0.06] text-oxblood",
        tone === "gold" && "border-brass bg-brass text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

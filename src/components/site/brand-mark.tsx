import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brass text-ink shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]">
        <span className="absolute inset-1 rounded-full border border-ink/20" />
        <Scissors size={18} aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-sm font-semibold tracking-[0.32em]">CORTE</span>
          <span className="mt-1 block text-sm font-semibold tracking-[0.32em] text-brass">
            NOBRE
          </span>
        </span>
      ) : null}
    </span>
  );
}

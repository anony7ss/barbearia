import { cn, formatCurrency } from "@/lib/utils";

type DashboardCardsProps = {
  cards: Array<{
    label: string;
    value: string | number;
    detail?: string;
    tone?: "default" | "gold" | "green";
    currency?: boolean;
  }>;
};

export function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-[1.5rem] border border-line bg-smoke p-5",
            card.tone === "gold" && "bg-brass text-ink",
            card.tone === "green" && "bg-evergreen/35",
          )}
        >
          <p className={cn("text-sm text-muted", card.tone === "gold" && "text-ink/70")}>
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            {card.currency && typeof card.value === "number" ? formatCurrency(card.value) : card.value}
          </p>
          {card.detail ? (
            <p className={cn("mt-2 text-xs text-muted", card.tone === "gold" && "text-ink/70")}>
              {card.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

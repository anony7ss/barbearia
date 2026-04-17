"use client";

import { cn } from "@/lib/utils";

type BookingCalendarProps = {
  value: string;
  onChange: (date: string) => void;
  compact?: boolean;
};

export function BookingCalendar({ value, onChange, compact = false }: BookingCalendarProps) {
  const dates = getNextDates(12);

  return (
    <div className={cn(
      "grid gap-2",
      compact ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6",
    )}>
      {dates.map((date) => (
        <button
          type="button"
          key={date.value}
          onClick={() => onChange(date.value)}
          className={cn(
            "min-h-20 rounded-2xl border border-line bg-white/[0.03] p-3 text-left transition hover:border-brass/60",
            value === date.value && "border-brass bg-brass text-ink",
          )}
        >
          <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
            {date.weekday}
          </span>
          <span className="mt-2 block text-2xl font-semibold">{date.day}</span>
          <span className="text-xs">{date.month}</span>
        </button>
      ))}
    </div>
  );
}

function getNextDates(total: number) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });

  return Array.from({ length: total }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const [weekday, month] = formatter.format(date).replace(".", "").split(", ");

    return {
      value: date.toISOString().slice(0, 10),
      weekday,
      day: String(date.getDate()).padStart(2, "0"),
      month,
    };
  });
}

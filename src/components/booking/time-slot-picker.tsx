"use client";

import { cn } from "@/lib/utils";

export type ClientSlot = {
  barberId: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
};

type TimeSlotPickerProps = {
  slots: ClientSlot[];
  selected?: ClientSlot | null;
  onSelect: (slot: ClientSlot) => void;
  compact?: boolean;
};

export function TimeSlotPicker({ slots, selected, onSelect, compact = false }: TimeSlotPickerProps) {
  if (!slots.length) {
    return (
      <div className="rounded-2xl border border-line p-5 text-sm text-muted">
        Nenhum horario disponivel para essa combinacao.
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-2",
      compact ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    )}>
      {slots.map((slot) => {
        const label = new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }).format(new Date(slot.startsAt));
        const active = selected?.startsAt === slot.startsAt && selected.barberId === slot.barberId;

        return (
          <button
            type="button"
            key={`${slot.barberId}-${slot.startsAt}`}
            onClick={() => onSelect(slot)}
            aria-label={`${label} com ${slot.barberName}`}
            className={cn(
              "min-h-16 rounded-2xl border border-line bg-white/[0.03] px-3 py-2 text-left transition hover:border-brass/60",
              compact && "flex min-h-14 items-center justify-center rounded-xl px-4 py-3 text-center",
              active && "border-brass bg-brass text-ink",
            )}
          >
            {compact ? (
              <span className="block text-lg font-semibold leading-none">{label}</span>
            ) : (
              <>
                <span className="block text-lg font-semibold">{label}</span>
                <span className="block truncate text-xs">{slot.barberName}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { barbers, services } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type Slot = {
  barberId: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
};

export function NextAvailableCTA({
  className,
  tone = "dark",
  serviceId = services[0]?.id,
  barberId = "any",
}: {
  className?: string;
  tone?: "dark" | "light";
  serviceId?: string;
  barberId?: string;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!serviceId) return;
      setLoading(true);
      const dates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(date);
      });

      for (const date of dates) {
        const response = await fetch("/api/booking/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId, barberId, date }),
        });

        if (!response.ok) continue;
        const payload = (await response.json()) as { slots: Slot[] };
        if (payload.slots[0]) {
          if (mounted) {
            setSlot(payload.slots[0]);
            setLoading(false);
          }
          return;
        }
      }

      if (mounted) {
        setSlot(null);
        setLoading(false);
      }
    }

    run().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [barberId, serviceId]);

  const href = slot
    ? `/agendamento?service=${services.find((service) => service.id === serviceId)?.slug ?? services[0].slug}${barberId === "any" ? "" : `&barber=${barbers.find((barber) => barber.id === slot.barberId)?.slug ?? ""}`}`
    : "/agendamento";

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-[1.35rem] border p-3 pr-5 transition hover:-translate-y-0.5",
        tone === "dark"
          ? "border-line bg-background/70 text-foreground backdrop-blur-xl hover:border-brass/60"
          : "border-ink/10 bg-white text-ink shadow-[0_18px_70px_rgba(21,18,15,0.1)]",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          tone === "dark" ? "bg-brass text-ink" : "bg-ink text-paper",
        )}
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <CalendarClock size={18} />}
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
          Proximo horario
        </span>
        <span className="mt-1 block text-sm font-semibold">
          {loading ? "Consultando agenda..." : slot ? formatSlot(slot.startsAt) : "Ver semana"}
        </span>
      </span>
    </Link>
  );
}

function formatSlot(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

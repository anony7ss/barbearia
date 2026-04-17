import Link from "next/link";
import { CalendarCheck } from "lucide-react";

export function MobileBookingCTA() {
  return (
    <Link
      href="/agendamento"
      className="fixed inset-x-4 bottom-4 z-40 flex min-h-14 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink shadow-[0_18px_70px_rgba(0,0,0,0.45)] lg:hidden"
    >
      <CalendarCheck size={18} aria-hidden="true" />
      Agendar agora
    </Link>
  );
}

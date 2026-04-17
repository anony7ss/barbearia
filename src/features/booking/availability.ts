type TimeString = `${number}:${number}:${number}` | `${number}:${number}`;

export type AvailabilityService = {
  id: string;
  duration_minutes: number;
  buffer_minutes: number | null;
};

export type AvailabilityBarber = {
  id: string;
  name: string;
};

export type AvailabilityRule = {
  barber_id: string | null;
  weekday: number;
  start_time: TimeString;
  end_time: TimeString;
  break_start: TimeString | null;
  break_end: TimeString | null;
};

export type BusySlot = {
  barber_id: string | null;
  starts_at: string;
  ends_at: string;
};

export type BusinessAvailabilitySettings = {
  timezone: string;
  min_notice_minutes: number;
  max_advance_days: number;
  slot_interval_minutes: number;
  default_buffer_minutes: number;
};

export type AvailableSlot = {
  barberId: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
};

type ComputeAvailabilityInput = {
  date: string;
  service: AvailabilityService;
  barbers: AvailabilityBarber[];
  rules: AvailabilityRule[];
  busySlots: BusySlot[];
  settings: BusinessAvailabilitySettings;
  requestedBarberId?: string | null;
};

const SAO_PAULO_OFFSET = "-03:00";

export function computeAvailableSlots(input: ComputeAvailabilityInput) {
  const duration = input.service.duration_minutes + (input.service.buffer_minutes ?? input.settings.default_buffer_minutes);
  const now = new Date();
  const maxDate = new Date(now.getTime() + input.settings.max_advance_days * 24 * 60 * 60 * 1000);
  const candidateBarbers = input.requestedBarberId
    ? input.barbers.filter((barber) => barber.id === input.requestedBarberId)
    : input.barbers;

  const slots: AvailableSlot[] = [];

  for (const barber of candidateBarbers) {
    const weekday = getWeekdayInSaoPaulo(input.date);
    const barberRules = input.rules.filter(
      (rule) => rule.weekday === weekday && (!rule.barber_id || rule.barber_id === barber.id),
    );

    for (const rule of barberRules) {
      const dayStart = buildLocalDate(input.date, rule.start_time);
      const dayEnd = buildLocalDate(input.date, rule.end_time);
      const breakStart = rule.break_start ? buildLocalDate(input.date, rule.break_start) : null;
      const breakEnd = rule.break_end ? buildLocalDate(input.date, rule.break_end) : null;

      for (
        let cursor = new Date(dayStart);
        cursor.getTime() + duration * 60_000 <= dayEnd.getTime();
        cursor = new Date(cursor.getTime() + input.settings.slot_interval_minutes * 60_000)
      ) {
        const endsAt = new Date(cursor.getTime() + duration * 60_000);
        const minimumStart = new Date(now.getTime() + input.settings.min_notice_minutes * 60_000);

        if (cursor < minimumStart || cursor > maxDate) {
          continue;
        }

        if (breakStart && breakEnd && overlaps(cursor, endsAt, breakStart, breakEnd)) {
          continue;
        }

        const hasConflict = input.busySlots.some((busy) => {
          const appliesToBarber = !busy.barber_id || busy.barber_id === barber.id;
          return appliesToBarber && overlaps(cursor, endsAt, new Date(busy.starts_at), new Date(busy.ends_at));
        });

        if (!hasConflict) {
          slots.push({
            barberId: barber.id,
            barberName: barber.name,
            startsAt: cursor.toISOString(),
            endsAt: endsAt.toISOString(),
          });
        }
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function buildLocalDate(date: string, time: TimeString) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}${SAO_PAULO_OFFSET}`);
}

function getWeekdayInSaoPaulo(date: string) {
  return new Date(`${date}T12:00:00${SAO_PAULO_OFFSET}`).getDay();
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export type AppointmentPolicySettings = {
  cancellation_limit_minutes?: number | null;
  reschedule_limit_minutes?: number | null;
};

export type AppointmentPolicyInput = {
  starts_at: string;
  status: string;
};

export type AppointmentPolicy = {
  canCancel: boolean;
  canReschedule: boolean;
  cancellationLimitMinutes: number;
  rescheduleLimitMinutes: number;
  cancelReason: string | null;
  rescheduleReason: string | null;
  minutesUntilStart: number;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed"]);

export function getAppointmentPolicy(
  appointment: AppointmentPolicyInput,
  settings?: AppointmentPolicySettings | null,
  now = new Date(),
): AppointmentPolicy {
  const cancellationLimitMinutes = settings?.cancellation_limit_minutes ?? 120;
  const rescheduleLimitMinutes = settings?.reschedule_limit_minutes ?? 240;
  const minutesUntilStart = Math.floor(
    (new Date(appointment.starts_at).getTime() - now.getTime()) / 60000,
  );
  const active = ACTIVE_STATUSES.has(appointment.status);
  const canCancel = active && minutesUntilStart >= cancellationLimitMinutes;
  const canReschedule = active && minutesUntilStart >= rescheduleLimitMinutes;

  return {
    canCancel,
    canReschedule,
    cancellationLimitMinutes,
    rescheduleLimitMinutes,
    cancelReason: canCancel
      ? null
      : getPolicyReason(appointment.status, minutesUntilStart, cancellationLimitMinutes, "cancelamento"),
    rescheduleReason: canReschedule
      ? null
      : getPolicyReason(appointment.status, minutesUntilStart, rescheduleLimitMinutes, "reagendamento"),
    minutesUntilStart,
  };
}

function getPolicyReason(
  status: string,
  minutesUntilStart: number,
  limitMinutes: number,
  action: string,
) {
  if (!ACTIVE_STATUSES.has(status)) {
    return status === "cancelled"
      ? "Este agendamento ja foi cancelado."
      : "Esta acao nao esta disponivel para o status atual.";
  }

  if (minutesUntilStart < 0) {
    return "Este horario ja passou.";
  }

  return `O ${action} e permitido ate ${formatLimit(limitMinutes)} antes do horario.`;
}

export function formatLimit(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

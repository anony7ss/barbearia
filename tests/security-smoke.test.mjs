import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("admin client role escalation requires explicit confirmation and keeps last admin", () => {
  const route = source("src/app/api/admin/clients/[id]/route.ts");
  assert.match(route, /confirm_admin_role/);
  assert.match(route, /Confirmacao obrigatoria para promover admin/);
  assert.match(route, /countRemainingAdmins/);
  assert.match(route, /Nao e possivel remover o ultimo admin ativo/);
});

test("barber appointment mutations are scoped to the linked barber only", () => {
  const route = source("src/app/api/barber/appointments/[id]/route.ts");
  assert.match(route, /requireBarber\(\)/);
  assert.match(route, /\.eq\("barber_id", barber\.id\)/);
  assert.doesNotMatch(route, /requireAdmin\(\)/);
});

test("guest appointment access uses token hash and generic not-found response", () => {
  const accessRoute = source("src/app/api/booking/access/route.ts");
  const appointmentRoute = source("src/app/api/booking/appointments/[id]/route.ts");
  assert.match(accessRoute, /verifyTokenHash\(token, data\.guest_access_token_hash\)/);
  assert.match(appointmentRoute, /verifyTokenHash\(token, appointment\.guest_access_token_hash\)/);
  assert.match(appointmentRoute, /throw new ApiError\(404, "Agendamento nao encontrado\."\)/);
});

test("reschedule outside policy window is blocked server-side", () => {
  const route = source("src/app/api/booking/appointments/[id]/route.ts");
  assert.match(route, /assertAppointmentAction\(appointment, "reschedule"\)/);
  assert.match(route, /getAppointmentPolicy/);
});

test("availability checks server-side conflicts before booking", () => {
  const availability = source("src/features/booking/availability.ts");
  const bookingRoute = source("src/app/api/booking/appointments/route.ts");
  assert.match(availability, /hasConflict/);
  assert.match(availability, /overlaps\(cursor, endsAt/);
  assert.match(bookingRoute, /if \(!selected\)/);
  assert.match(bookingRoute, /Horario indisponivel/);
});

test("CSV exports neutralize spreadsheet formula injection", () => {
  const appointmentsExport = source("src/app/api/admin/appointments/export/route.ts");
  const clientsExport = source("src/app/api/admin/clients/export/route.ts");
  assert.match(appointmentsExport, /\^\[=\+\\-@\\t\\r\]/);
  assert.match(clientsExport, /\^\[=\+\\-@\\t\\r\]/);
});

test("notification cron fails closed and logs email failures safely", () => {
  const cronRoute = source("src/app/api/admin/notifications/process/route.ts");
  const bookingRoute = source("src/app/api/booking/appointments/route.ts");
  assert.match(cronRoute, /Cron nao configurado/);
  assert.match(cronRoute, /authorization"\) !== `Bearer \$\{secret\}`/);
  assert.match(cronRoute, /safeOperationalError/);
  assert.match(bookingRoute, /booking_confirmation_email_failed/);
});

test("turnstile only skips captcha when explicitly disabled", () => {
  const turnstile = source("src/lib/server/turnstile.ts");
  assert.match(turnstile, /TURNSTILE_REQUIRED !== "false"/);
  assert.match(turnstile, /process\.env\.NODE_ENV === "production" && required/);
});

test("security hardening migration validates admin before soft delete RPC", () => {
  const migration = source("supabase/migrations/202604170001_security_hardening.sql");
  assert.match(migration, /not public\.is_admin\(\)/);
  assert.match(migration, /Actor mismatch/);
  assert.match(migration, /Cannot soft delete own admin profile/);
});

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
  const config = source("src/lib/turnstile-config.ts");
  assert.match(turnstile, /isTurnstileServerEnabled\(\)/);
  assert.match(turnstile, /process\.env\.NODE_ENV === "production"/);
  assert.match(config, /isDisabledEnvValue\(process\.env\.TURNSTILE_REQUIRED\)/);
  assert.match(config, /isEnabledEnvValue\(process\.env\.TURNSTILE_REQUIRED\)/);
});

test("auth forms use server-side auth endpoints", () => {
  const form = source("src/components/auth/auth-form.tsx");
  const signupRoute = source("src/app/api/auth/signup/route.ts");
  assert.doesNotMatch(form, /signInWithPassword/);
  assert.doesNotMatch(form, /signUp\(/);
  assert.match(form, /\/api\/auth\/login/);
  assert.match(form, /\/api\/auth\/signup/);
  assert.match(signupRoute, /verifyTurnstileToken/);
});

test("guest URL tokens are exchanged into rotated http-only cookies", () => {
  const accessRoute = source("src/app/api/booking/access/route.ts");
  const success = source("src/components/booking/booking-success.tsx");
  assert.match(accessRoute, /createAccessToken\(\)/);
  assert.match(accessRoute, /guest_access_token_hash: nextHash/);
  assert.match(accessRoute, /setGuestAccessCookie\(response, parsed\.appointmentId, sessionToken\)/);
  assert.doesNotMatch(success, /token=\$\{encodeURIComponent/);
});

test("admin-only views and public settings are hardened by follow-up migration", () => {
  const migration = source("supabase/migrations/202604180001_security_audit_followup.sql");
  assert.match(migration, /revoke all on public\.admin_appointment_summary from anon, authenticated/);
  assert.match(migration, /drop policy if exists business_settings_public_read/);
  assert.match(migration, /public_business_settings/);
  assert.match(migration, /audit_redact_row/);
});

test("json parsing enforces real body size and does not trust only content-length", () => {
  const api = source("src/lib/server/api.ts");
  assert.match(api, /request\.body\.getReader\(\)/);
  assert.match(api, /bytesRead \+= value\.byteLength/);
  assert.match(api, /bytesRead > maxJsonBodyBytes/);
  assert.doesNotMatch(api, /await request\.json\(\)/);
});

test("security hardening migration validates admin before soft delete RPC", () => {
  const migration = source("supabase/migrations/202604170001_security_hardening.sql");
  assert.match(migration, /not public\.is_admin\(\)/);
  assert.match(migration, /Actor mismatch/);
  assert.match(migration, /Cannot soft delete own admin profile/);
});

test("security follow-up migration fixes touch_updated_at search_path and removes public gallery listing", () => {
  const migration = source("supabase/migrations/202604210001_security_followup.sql");
  assert.match(migration, /create or replace function public\.touch_updated_at\(\)/);
  assert.match(migration, /set search_path = public/);
  assert.match(migration, /drop policy if exists gallery_public_read on storage\.objects/);
});

test("pwa service worker does not cache private routes or api responses", () => {
  const sw = source("public/sw.js");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");
  assert.match(sw, /PRIVATE_PREFIXES/);
  assert.match(sw, /"\/api\/"/);
  assert.match(sw, /"\/admin"/);
  assert.match(sw, /"\/barbeiro"/);
  assert.match(sw, /"\/meus-agendamentos"/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /networkOnlyWithOfflineFallback/);
  assert.match(proxy, /manifest\.webmanifest\|sw\.js/);
  assert.match(nextConfig, /source: "\/sw\.js"/);
  assert.match(nextConfig, /no-cache, no-store, must-revalidate/);
});

test("appointment reviews require ownership or guest token and completed status", () => {
  const route = source("src/app/api/booking/reviews/route.ts");
  const migration = source("supabase/migrations/202604180002_appointment_reviews.sql");
  assert.match(route, /appointment\.user_id === user\.id/);
  assert.match(route, /verifyTokenHash\(token, appointment\.guest_access_token_hash\)/);
  assert.match(route, /appointment\.status !== "completed"/);
  assert.match(route, /\.eq\("appointment_id", appointment\.id\)/);
  assert.match(migration, /alter table public\.appointment_reviews enable row level security/);
  assert.match(migration, /a\.status = 'completed'/);
  assert.match(migration, /is_public and is_approved/);
});

const disabledValues = new Set(["false", "0", "off", "no", "disabled"]);
const enabledValues = new Set(["true", "1", "on", "yes", "enabled"]);

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase();
}

export function isDisabledEnvValue(value: string | undefined) {
  const normalized = normalize(value);
  return Boolean(normalized && disabledValues.has(normalized));
}

export function isEnabledEnvValue(value: string | undefined) {
  const normalized = normalize(value);
  return Boolean(normalized && enabledValues.has(normalized));
}

export function isTurnstileServerEnabled() {
  if (
    isDisabledEnvValue(process.env.TURNSTILE_REQUIRED) ||
    isDisabledEnvValue(process.env.TURNSTILE_ENABLED) ||
    isDisabledEnvValue(process.env.TURNSTILE_SECRET_KEY) ||
    isDisabledEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  ) {
    return false;
  }

  return isEnabledEnvValue(process.env.TURNSTILE_REQUIRED) || isEnabledEnvValue(process.env.TURNSTILE_ENABLED);
}

export function isTurnstilePublicEnabled() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (
    !siteKey ||
    isDisabledEnvValue(siteKey) ||
    isDisabledEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_ENABLED) ||
    isDisabledEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_REQUIRED)
  ) {
    return false;
  }

  return (
    isEnabledEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_ENABLED) ||
    isEnabledEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_REQUIRED)
  );
}

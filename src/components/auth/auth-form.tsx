"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/integrations/supabase/client";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, SuccessState } from "@/components/ui/state";

type AuthFormProps = {
  mode: "login" | "signup";
  redirectTo?: string;
  initialOAuthError?: string | null;
};

export function AuthForm({
  mode,
  redirectTo = "/meus-agendamentos",
  initialOAuthError = null,
}: AuthFormProps) {
  const [error, setError] = useState<string | null>(initialOAuthError);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<"google" | "apple" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
    const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          setError("Email ou senha invalidos.");
          return;
        }

        window.location.assign(redirectTo);
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
          captchaToken,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { authenticated?: boolean; requiresEmailConfirmation?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.error) {
        setError(payload?.error ?? "Nao foi possivel criar a conta com esses dados.");
        return;
      }

      if (payload?.authenticated) {
        window.location.assign(redirectTo);
        return;
      }

      setSuccess("Conta criada. Confira seu email se a confirmacao estiver ativa.");
    } catch {
      setError("Configure o Supabase para usar autenticacao.");
    } finally {
      setLoading(false);
    }
  }

  async function startOAuth(provider: "google" | "apple") {
    setError(null);
    setSuccess(null);
    setOAuthLoading(provider);

    try {
      const supabase = createSupabaseBrowserClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;
      const callbackUrl = new URL("/auth/callback", siteUrl);
      callbackUrl.searchParams.set("next", redirectTo);
      callbackUrl.searchParams.set("source", mode);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (oauthError) {
        setError(getOAuthErrorMessage(provider));
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setError("Nao foi possivel iniciar esse login agora.");
    } catch {
      setError(getOAuthErrorMessage(provider));
    } finally {
      setOAuthLoading(null);
    }
  }

  return (
    <form onSubmit={submit} className="grid self-start content-start gap-4 rounded-[2rem] border border-line bg-smoke p-5 sm:p-6">
      <div className="grid gap-3">
        <OAuthButton
          provider="google"
          label="Continuar com Google"
          loading={oauthLoading === "google"}
          onClick={() => startOAuth("google")}
        />
        <OAuthButton
          provider="apple"
          label="Continuar com iCloud"
          loading={oauthLoading === "apple"}
          onClick={() => startOAuth("apple")}
        />
      </div>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">ou</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {mode === "signup" ? (
        <>
          <label className="grid gap-2 text-sm font-medium">
            Nome
            <input name="fullName" required minLength={2} className="field" autoComplete="name" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Telefone
            <input name="phone" required inputMode="tel" className="field" autoComplete="tel" />
          </label>
        </>
      ) : null}
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input name="email" required type="email" className="field" autoComplete="email" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Senha
        <input name="password" required type="password" minLength={8} className="field" autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </label>

      {mode === "signup" ? <TurnstileField /> : null}

      {error ? <ErrorState title={error} /> : null}
      {success ? <SuccessState title={success} /> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            <Link href="/recuperar-senha" className="font-semibold text-brass">
              Esqueci minha senha
            </Link>
            <span className="mx-2 text-muted/70">|</span>
            Ainda nao tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-brass">
              Criar cadastro
            </Link>
          </>
        ) : (
          <>
            Ja tem conta?{" "}
            <Link href="/login" className="font-semibold text-brass">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function OAuthButton({
  provider,
  label,
  loading,
  onClick,
}: {
  provider: "google" | "apple";
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-line bg-background/45 px-5 text-sm font-semibold text-foreground transition hover:border-brass/50 hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {provider === "google" ? <GoogleIcon /> : <ICloudIcon />}
      <span>{loading ? "Redirecionando..." : label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.194 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.173 0-9.625-3.328-11.283-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.085 5.57l.003-.002 6.19 5.238C36.971 39.17 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
    </svg>
  );
}

function ICloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#66B8FF"
        d="M17.5 19a4.5 4.5 0 0 0 .55-8.966A6.5 6.5 0 0 0 5.66 8.26 4 4 0 0 0 6 16.25h11.5A2.75 2.75 0 1 1 17.5 19Z"
      />
      <path
        fill="#E9F6FF"
        d="M17.5 18H6a3 3 0 1 1 .36-5.978 5.5 5.5 0 0 1 10.582 1.17A3.5 3.5 0 1 1 17.5 18Z"
      />
    </svg>
  );
}

function getOAuthErrorMessage(provider: "google" | "apple") {
  if (provider === "google") {
    return "Ative o provedor Google no Supabase Auth para usar esse login.";
  }

  return "Ative o provedor Apple no Supabase Auth para usar esse login.";
}

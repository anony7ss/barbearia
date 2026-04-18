"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, SuccessState } from "@/components/ui/state";

type AuthFormProps = {
  mode: "login" | "signup";
  redirectTo?: string;
};

export function AuthForm({ mode, redirectTo = "/meus-agendamentos" }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={submit} className="grid self-start content-start gap-4 rounded-[2rem] border border-line bg-smoke p-5 sm:p-6">
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

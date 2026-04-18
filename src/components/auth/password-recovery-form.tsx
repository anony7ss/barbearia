"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, SuccessState } from "@/components/ui/state";

export function PasswordRecoveryForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

    try {
      const response = await fetch("/api/auth/password/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Nao foi possivel enviar o link agora.");
        return;
      }

      form.reset();
      setSuccess("Se esse email estiver cadastrado, enviaremos um link seguro para redefinir a senha.");
    } catch {
      setError("Nao foi possivel enviar o link agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid self-start content-start gap-4 rounded-[2rem] border border-line bg-smoke p-5 sm:p-6">
      <label className="grid gap-2 text-sm font-medium">
        Email da conta
        <input
          name="email"
          required
          type="email"
          className="field"
          autoComplete="email"
          placeholder="voce@email.com"
        />
      </label>

      <TurnstileField />

      {error ? <ErrorState title={error} /> : null}
      {success ? <SuccessState title={success} /> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar link de redefinicao"}
      </button>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-semibold text-brass">
          Entrar
        </Link>
      </p>
    </form>
  );
}

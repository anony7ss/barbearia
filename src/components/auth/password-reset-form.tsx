"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ErrorState, SuccessState } from "@/components/ui/state";

export function PasswordResetForm({ canReset }: { canReset: boolean }) {
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
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Nao foi possivel redefinir a senha.");
        return;
      }

      form.reset();
      setSuccess("Senha redefinida. Entre novamente com a nova senha.");
    } catch {
      setError("Nao foi possivel redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (!canReset) {
    return (
      <div className="grid self-start content-start gap-4 rounded-[2rem] border border-line bg-smoke p-5 sm:p-6">
        <ErrorState
          title="Link expirado ou invalido"
          description="Solicite um novo link de redefinicao para continuar."
        />
        <Link
          href="/recuperar-senha"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68]"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid self-start content-start gap-4 rounded-[2rem] border border-line bg-smoke p-5 sm:p-6">
      <label className="grid gap-2 text-sm font-medium">
        Nova senha
        <input
          name="password"
          required
          type="password"
          minLength={8}
          maxLength={128}
          className="field"
          autoComplete="new-password"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Confirmar nova senha
        <input
          name="confirmPassword"
          required
          type="password"
          minLength={8}
          maxLength={128}
          className="field"
          autoComplete="new-password"
        />
      </label>

      <p className="text-sm leading-6 text-muted">
        Use pelo menos 8 caracteres, com letras e numeros. Depois da alteracao,
        sua sessao sera encerrada por seguranca.
      </p>

      {error ? <ErrorState title={error} /> : null}
      {success ? (
        <SuccessState
          title={success}
          description="O link de redefinicao nao podera ser reutilizado."
        />
      ) : null}

      <button
        type="submit"
        disabled={loading || Boolean(success)}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Redefinindo..." : "Redefinir senha"}
      </button>

      {success ? (
        <Link href="/login" className="text-center text-sm font-semibold text-brass">
          Entrar com a nova senha
        </Link>
      ) : null}
    </form>
  );
}

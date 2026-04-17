"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/integrations/supabase/client";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, SuccessState } from "@/components/ui/state";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
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
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError("Email ou senha invalidos.");
          return;
        }

        router.replace("/meus-agendamentos");
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken: captchaToken || undefined,
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (authError) {
        setError("Nao foi possivel criar a conta com esses dados.");
        return;
      }

      if (data.session) {
        router.replace("/meus-agendamentos");
        router.refresh();
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

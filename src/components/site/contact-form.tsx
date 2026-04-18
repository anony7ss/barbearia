"use client";

import { useState, type FormEvent } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { TurnstileField } from "@/components/security/turnstile-field";
import { ErrorState, SuccessState } from "@/components/ui/state";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.turnstileToken = String(data["cf-turnstile-response"] ?? "");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    form.reset();
    setStatus("success");
  }

  return (
    <form onSubmit={onSubmit} className="grid min-w-0 gap-5 rounded-[1.5rem] border border-line bg-smoke p-4 sm:rounded-[2rem] sm:p-6">
      <div className="flex min-w-0 items-start gap-4 border-b border-line pb-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brass text-ink">
          <Send size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold">Mensagem direta</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Envie duvida, pedido especial ou ajuste de horario. Respondemos pelo
            contato informado.
          </p>
        </div>
      </div>
      <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium">Nome</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          autoComplete="name"
          placeholder="Seu nome"
          className="min-h-12 w-full min-w-0 rounded-2xl border border-line bg-background px-4 text-foreground outline-none transition placeholder:text-muted/70 focus:border-brass"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className="min-h-12 w-full min-w-0 rounded-2xl border border-line bg-background px-4 text-foreground outline-none transition placeholder:text-muted/70 focus:border-brass"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="phone" className="text-sm font-medium">Telefone</label>
          <input
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="WhatsApp"
            className="min-h-12 w-full min-w-0 rounded-2xl border border-line bg-background px-4 text-foreground outline-none transition placeholder:text-muted/70 focus:border-brass"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium">Mensagem</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={5}
          placeholder="Conte o que precisa resolver"
          className="w-full min-w-0 rounded-2xl border border-line bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/70 focus:border-brass"
        />
      </div>
      <TurnstileField />

      {status === "success" ? <SuccessState title="Mensagem enviada" description="Retornaremos pelo contato informado." /> : null}
      {status === "error" ? <ErrorState title="Nao foi possivel enviar" description="Revise os dados e tente novamente." /> : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={16} aria-hidden="true" />
        {status === "loading" ? "Enviando..." : "Enviar mensagem"}
      </button>
      <p className="flex min-w-0 items-center gap-2 text-xs leading-5 text-muted">
        <ShieldCheck size={14} className="text-brass" aria-hidden="true" />
        <span>Protegido contra spam e sem exposicao publica dos seus dados.</span>
      </p>
    </form>
  );
}

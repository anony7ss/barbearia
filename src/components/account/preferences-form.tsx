"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { ErrorState, SuccessState } from "@/components/ui/state";

type Option = {
  id: string;
  name: string;
};

type Preferences = {
  favorite_barber_id: string | null;
  favorite_service_id: string | null;
  personal_notes: string | null;
  birthday: string | null;
  marketing_opt_in: boolean;
} | null;

export function PreferencesForm({
  barbers,
  services,
  preferences,
}: {
  barbers: Option[];
  services: Option[];
  preferences: Preferences;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favoriteBarberId: data.favoriteBarberId,
        favoriteServiceId: data.favoriteServiceId,
        personalNotes: data.personalNotes,
        birthday: data.birthday,
        marketingOptIn: data.marketingOptIn === "on",
      }),
    });

    setStatus(response.ok ? "success" : "error");
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-[2rem] border border-line bg-smoke p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Barbeiro favorito
          <select name="favoriteBarberId" defaultValue={preferences?.favorite_barber_id ?? ""} className="field">
            <option value="">Sem preferencia</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Servico mais usado
          <select name="favoriteServiceId" defaultValue={preferences?.favorite_service_id ?? ""} className="field">
            <option value="">Sem preferencia</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Aniversario
        <input name="birthday" type="date" defaultValue={preferences?.birthday ?? ""} className="field" />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Observacoes pessoais para atendimento
        <textarea
          name="personalNotes"
          defaultValue={preferences?.personal_notes ?? ""}
          rows={5}
          maxLength={500}
          className="rounded-2xl border border-line bg-background px-4 py-3 text-foreground outline-none transition focus:border-brass"
          placeholder="Ex: prefiro acabamento natural, barba mais baixa, evitar pomada forte."
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          name="marketingOptIn"
          type="checkbox"
          defaultChecked={preferences?.marketing_opt_in ?? false}
          className="mt-1 h-4 w-4 accent-brass"
        />
        Quero receber beneficios, lembretes e campanhas de fidelidade.
      </label>

      {status === "success" ? <SuccessState title="Preferencias salvas" /> : null}
      {status === "error" ? <ErrorState title="Nao foi possivel salvar" description="Confira se a migration nova ja foi aplicada." /> : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-bold text-ink transition hover:bg-[#d4aa68] disabled:opacity-60"
      >
        <Save size={16} aria-hidden="true" />
        {status === "saving" ? "Salvando..." : "Salvar preferencias"}
      </button>
    </form>
  );
}

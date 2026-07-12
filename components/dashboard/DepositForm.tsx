"use client";

import { useActionState, useRef } from "react";
import { deposit, type ActionState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";

const presets = [50, 100, 250, 500, 1000];

export function DepositForm() {
  const [state, action] = useActionState<ActionState, FormData>(deposit, {});
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="amount">Montant à déposer (€)</label>
        <input
          ref={inputRef}
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="input text-lg"
          placeholder="0,00"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = String(p);
            }}
            className="btn-outline text-xs"
          >
            + {p} €
          </button>
        ))}
      </div>
      <SubmitButton className="btn-accent w-full py-3 text-base" pendingLabel="Dépôt…">
        Déposer les fonds
      </SubmitButton>
      <p className="text-center text-xs text-ink/40">
        Votre solde est crédité immédiatement après validation.
      </p>
    </form>
  );
}

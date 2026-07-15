"use client";

import { useActionState } from "react";
import { adminCredit, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function AdminCreditForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(adminCredit, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{state.success}</p>
      )}
      <input type="hidden" name="user_id" value={userId} />

      <div>
        <label className="label" htmlFor="amount">Montant (€)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          required
          className="input text-lg"
          placeholder="0,00"
        />
        <p className="mt-1 text-xs text-ink/40">
          Positif pour créditer, négatif pour débiter le compte.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="reason">Motif</label>
        <input
          id="reason"
          name="reason"
          required
          className="input"
          placeholder="Ex : Régularisation virement"
        />
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Application…">
        Appliquer le crédit
      </SubmitButton>
    </form>
  );
}

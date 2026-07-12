"use client";

import { useActionState } from "react";
import { transfer, type ActionState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";

export function TransferForm({ balance }: { balance: number }) {
  const [state, action] = useActionState<ActionState, FormData>(transfer, {});

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="iban">IBAN du bénéficiaire</label>
        <input
          id="iban"
          name="iban"
          type="text"
          required
          className="input font-mono"
          placeholder="FR76 3000 4021 8850 0100"
        />
      </div>
      <div>
        <label className="label" htmlFor="amount">Montant (€)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="input text-lg"
          placeholder="0,00"
        />
        <p className="mt-1 text-xs text-ink/40">Solde disponible : {balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
      </div>
      <div>
        <label className="label" htmlFor="description">Motif (facultatif)</label>
        <input id="description" name="description" type="text" maxLength={140} className="input" placeholder="Loyer, remboursement…" />
      </div>
      <SubmitButton className="btn-primary w-full py-3 text-base" pendingLabel="Envoi…">
        Soumettre le virement
      </SubmitButton>
      <p className="text-center text-xs text-ink/40">
        Le virement est soumis à validation par un conseiller. Les fonds sont réservés dès l&apos;envoi ;
        en cas de refus, ils vous sont intégralement recrédités.
      </p>
    </form>
  );
}

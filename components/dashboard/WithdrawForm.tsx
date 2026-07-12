"use client";

import { useActionState } from "react";
import { withdraw, type ActionState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { formatIban } from "@/lib/format";
import type { WithdrawalAccount } from "@/lib/types";

export function WithdrawForm({
  accounts,
  balance,
}: {
  accounts: WithdrawalAccount[];
  balance: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(withdraw, {});

  if (accounts.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Enregistrez d&apos;abord un IBAN de destination ci-dessous pour pouvoir
        effectuer un retrait.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="account_id">IBAN de destination</label>
        <select id="account_id" name="account_id" required className="input">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label ? `${a.label} — ` : ""}
              {formatIban(a.iban)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="amount">Montant (€)</label>
        <input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="input text-lg" placeholder="0,00" />
        <p className="mt-1 text-xs text-ink/40">Solde disponible : {balance.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
      </div>
      <div>
        <label className="label" htmlFor="code">Code de retrait</label>
        <input id="code" name="code" type="text" required className="input font-mono tracking-widest" placeholder="Code fourni par l'administrateur" />
        <p className="mt-1 text-xs text-ink/40">
          Un code de retrait valide, généré par l&apos;administrateur, est requis pour valider l&apos;opération.
        </p>
      </div>
      <SubmitButton className="btn-dark w-full py-3 text-base" pendingLabel="Validation…">
        Valider le retrait
      </SubmitButton>
    </form>
  );
}

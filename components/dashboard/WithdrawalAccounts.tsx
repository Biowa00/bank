"use client";

import { useActionState } from "react";
import {
  addWithdrawalAccount,
  deleteWithdrawalAccount,
  type ActionState,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { formatIban } from "@/lib/format";
import type { WithdrawalAccount } from "@/lib/types";

export function WithdrawalAccounts({
  accounts,
}: {
  accounts: WithdrawalAccount[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addWithdrawalAccount,
    {},
  );

  return (
    <div className="space-y-4">
      {accounts.length > 0 && (
        <ul className="divide-y divide-black/5">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                {a.label && <p className="text-sm font-medium text-ink">{a.label}</p>}
                <p className="truncate font-mono text-sm text-ink/60">{formatIban(a.iban)}</p>
              </div>
              <form action={deleteWithdrawalAccount}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-3 border-t border-black/5 pt-4">
        <FormFeedback state={state} />
        <div>
          <label className="label" htmlFor="label">Libellé (facultatif)</label>
          <input id="label" name="label" type="text" className="input" placeholder="Mon autre compte" />
        </div>
        <div>
          <label className="label" htmlFor="iban_new">IBAN de destination</label>
          <input id="iban_new" name="iban" type="text" required className="input font-mono" placeholder="FR76 …" />
        </div>
        <SubmitButton className="btn-outline w-full" pendingLabel="Ajout…">
          Enregistrer cet IBAN
        </SubmitButton>
      </form>
    </div>
  );
}

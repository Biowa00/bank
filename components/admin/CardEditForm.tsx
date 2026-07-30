"use client";

import { useActionState } from "react";
import { updateCard, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Édition par l'admin de la carte de crédit d'un client. Les `current*` sont
 * les surcharges déjà enregistrées (pré-remplies) ; les `derived*` sont les
 * valeurs calculées depuis l'IBAN, montrées en placeholder (= ce qui s'affiche
 * si le champ reste vide).
 */
export function CardEditForm({
  userId,
  currentNumber,
  currentExp,
  currentCvv,
  currentHolder,
  derivedNumber,
  derivedExp,
  derivedCvv,
  derivedHolder,
}: {
  userId: string;
  currentNumber: string | null;
  currentExp: string | null;
  currentCvv: string | null;
  currentHolder: string | null;
  derivedNumber: string;
  derivedExp: string;
  derivedCvv: string;
  derivedHolder: string;
}) {
  const [state, action] = useActionState<AdminState, FormData>(updateCard, {});

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
        <label className="label" htmlFor="card_holder">Titulaire</label>
        <input id="card_holder" name="card_holder" defaultValue={currentHolder ?? ""} placeholder={derivedHolder || "—"} className="input" maxLength={60} />
      </div>

      <div>
        <label className="label" htmlFor="card_number">Numéro de carte</label>
        <input id="card_number" name="card_number" defaultValue={currentNumber ?? ""} placeholder={derivedNumber} className="input font-mono" maxLength={25} inputMode="numeric" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="card_exp">Expiration (MM/AA)</label>
          <input id="card_exp" name="card_exp" defaultValue={currentExp ?? ""} placeholder={derivedExp} className="input font-mono" maxLength={5} />
        </div>
        <div>
          <label className="label" htmlFor="card_cvv">CVV</label>
          <input id="card_cvv" name="card_cvv" defaultValue={currentCvv ?? ""} placeholder={derivedCvv} className="input font-mono" maxLength={4} inputMode="numeric" />
        </div>
      </div>

      <p className="text-xs text-ink/40">
        Laissez un champ vide pour revenir à la valeur calculée automatiquement (affichée en gris).
      </p>

      <SubmitButton className="btn-primary w-full" pendingLabel="Enregistrement…">
        Enregistrer la carte
      </SubmitButton>
    </form>
  );
}

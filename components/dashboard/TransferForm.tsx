"use client";

import { useActionState } from "react";
import { transfer, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import { formatEuro } from "@/lib/format";

export function TransferForm({ balance }: { balance: number }) {
  const [state, action] = useActionState<ActionState, FormData>(transfer, {});
  const t = useZone("dashboard").transfer;
  const locale = useLocale();

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="iban">{t.ibanLabel}</label>
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
        <label className="label" htmlFor="amount">{t.amountLabel}</label>
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
        <p className="mt-1 text-xs text-ink/40">{t.availableBalance} {formatEuro(balance, locale)}</p>
      </div>
      <div>
        <label className="label" htmlFor="description">{t.descriptionLabel}</label>
        <input id="description" name="description" type="text" maxLength={140} className="input" placeholder={t.descriptionPlaceholder} />
      </div>
      <SubmitButton className="btn-primary w-full py-3 text-base" pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
      <p className="text-center text-xs text-ink/40">
        {t.note}
      </p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { withdraw, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { formatEuro, formatIban } from "@/lib/format";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import type { WithdrawalAccount } from "@/lib/types";

export function WithdrawForm({
  accounts,
  balance,
}: {
  accounts: WithdrawalAccount[];
  balance: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(withdraw, {});
  const t = useZone("dashboard").withdraw;
  const locale = useLocale();

  if (accounts.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.noAccounts}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="account_id">{t.destLabel}</label>
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
        <label className="label" htmlFor="amount">{t.amountLabel}</label>
        <input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="input text-lg" placeholder="0,00" />
        <p className="mt-1 text-xs text-ink/40">{t.availableBalance} {formatEuro(balance, locale)}</p>
      </div>
      <div>
        <label className="label" htmlFor="code">{t.codeLabel}</label>
        <input id="code" name="code" type="text" required className="input font-mono tracking-widest" placeholder={t.codePlaceholder} />
        <p className="mt-1 text-xs text-ink/40">
          {t.codeHint}
        </p>
      </div>
      <SubmitButton className="btn-dark w-full py-3 text-base" pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
    </form>
  );
}

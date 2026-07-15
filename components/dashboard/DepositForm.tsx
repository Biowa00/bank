"use client";

import { useActionState, useRef } from "react";
import { deposit, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { useZone } from "@/components/i18n/DictionaryProvider";

const presets = [50, 100, 250, 500, 1000];

export function DepositForm() {
  const [state, action] = useActionState<ActionState, FormData>(deposit, {});
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useZone("dashboard").deposit;

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="amount">{t.amountLabel}</label>
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
      <SubmitButton className="btn-accent w-full py-3 text-base" pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
      <p className="text-center text-xs text-ink/40">
        {t.note}
      </p>
    </form>
  );
}

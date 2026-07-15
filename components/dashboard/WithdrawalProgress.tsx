"use client";

import { useActionState, useEffect, useRef } from "react";
import { redeemWithdrawalCode, type RedeemState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function WithdrawalProgress({ initialProgress }: { initialProgress: number }) {
  const [state, action] = useActionState<RedeemState, FormData>(redeemWithdrawalCode, {});
  const formRef = useRef<HTMLFormElement>(null);
  const t = useZone("dashboard").withdrawalProgress;

  // Valeur dérivée : la progression renvoyée par le serveur prime, sinon l'initiale.
  // La transition CSS anime automatiquement le changement de largeur.
  const pct = Math.max(0, Math.min(100, state.progress ?? initialProgress));
  const full = pct >= 100;

  // Vide le champ après une validation réussie (pas de setState → pas d'effet en cascade).
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">{t.title}</h2>
        <span className={`tabular-nums text-lg font-bold ${full ? "text-accent-600" : "text-ink"}`}>
          {pct}%
        </span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/[.06]">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
            full ? "bg-accent-500" : "bg-brand-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-sm text-ink/50">
        {full ? t.complete : t.hint}
      </p>

      <form ref={formRef} action={action} className="mt-4 flex gap-2">
        <input
          name="code"
          required
          className="input font-mono tracking-widest"
          placeholder="RETR-XXXX"
        />
        <SubmitButton className="btn-primary shrink-0" pendingLabel={t.pending}>
          {t.submit}
        </SubmitButton>
      </form>

      {state.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-2 rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{state.success}</p>
      )}
    </div>
  );
}

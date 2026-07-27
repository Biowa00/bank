"use client";

import { useActionState } from "react";
import { confirmTransferPhase, type PhaseState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEuro, formatIban } from "@/lib/format";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import type { PendingTransfer } from "@/lib/pendingTransfers";

export type { PendingTransfer };

export function TransferPhaseConfirm({ transfers }: { transfers: PendingTransfer[] }) {
  const t = useZone("dashboard").transferPhases;
  if (transfers.length === 0) return null;

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-ink">{t.title}</h2>
      <div className="mt-4 space-y-4">
        {transfers.map((tr) => (
          <PendingCard key={tr.id} transfer={tr} />
        ))}
      </div>
    </div>
  );
}

function PendingCard({ transfer }: { transfer: PendingTransfer }) {
  const [state, action] = useActionState<PhaseState, FormData>(confirmTransferPhase, {});
  const t = useZone("dashboard").transferPhases;
  const locale = useLocale();

  return (
    <div className="rounded-2xl border border-black/[.06] p-4">
      <p className="text-sm font-medium text-ink">
        {t.transferOf.replace("{amount}", formatEuro(transfer.amount, locale))}
        {transfer.counterparty_iban ? ` ${t.toIban.replace("{iban}", formatIban(transfer.counterparty_iban))}` : ""}
      </p>

      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-3 rounded-lg bg-accent-500/10 px-3 py-2 text-xs text-accent-600">{state.success}</p>
      )}

      {transfer.awaitingCode ? (
        <div className="mt-3">
          {/* Motif/intitulé libre défini par le conseiller (affiché tel quel). */}
          <label className="label" htmlFor={`code-${transfer.id}`}>
            {transfer.codeLabel || t.codeFallback}
          </label>
          <form action={action} className="flex gap-2">
            <input type="hidden" name="transaction_id" value={transfer.id} />
            <input
              id={`code-${transfer.id}`}
              name="code"
              inputMode="numeric"
              required
              className="input font-mono tracking-[0.3em]"
              placeholder="000000"
              maxLength={6}
            />
            <SubmitButton className="btn-primary shrink-0 text-sm" pendingLabel={t.pending}>
              {t.confirm}
            </SubmitButton>
          </form>
          <p className="mt-1 text-xs text-ink/40">{t.codeHint}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {t.awaitingProcessing}
        </p>
      )}
    </div>
  );
}

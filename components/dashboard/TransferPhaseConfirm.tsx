"use client";

import { useActionState } from "react";
import { confirmTransferPhase, type PhaseState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { TRANSFER_PHASES, PHASE_TOTAL } from "@/lib/transferPhases";
import { formatEuro, formatIban } from "@/lib/format";
import type { PendingTransfer } from "@/lib/pendingTransfers";

export type { PendingTransfer };

export function TransferPhaseConfirm({ transfers }: { transfers: PendingTransfer[] }) {
  if (transfers.length === 0) return null;

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-ink">Virements en attente de confirmation</h2>
      <p className="mt-1 text-sm text-ink/50">
        Votre virement se débloque en {PHASE_TOTAL} phases. Saisissez chaque code reçu pour passer à la suivante.
      </p>
      <div className="mt-4 space-y-4">
        {transfers.map((t) => (
          <PendingCard key={t.id} transfer={t} />
        ))}
      </div>
    </div>
  );
}

function PendingCard({ transfer }: { transfer: PendingTransfer }) {
  const [state, action] = useActionState<PhaseState, FormData>(confirmTransferPhase, {});
  const done = transfer.unlock_phase;
  const currentPhase = done + 1;

  return (
    <div className="rounded-2xl border border-black/[.06] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">
          Virement de {formatEuro(transfer.amount)}
          {transfer.counterparty_iban ? ` vers ${formatIban(transfer.counterparty_iban)}` : ""}
        </p>
        <span className="text-xs font-semibold text-ink/60">{done}/{PHASE_TOTAL}</span>
      </div>

      {/* Étapes */}
      <ol className="mt-3 space-y-1.5">
        {TRANSFER_PHASES.map(({ phase, name }) => {
          const state2 =
            phase <= done ? "valide" : phase === currentPhase ? "en_cours" : "a_venir";
          return (
            <li key={phase} className="flex items-center gap-2 text-xs">
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                  state2 === "valide"
                    ? "bg-accent-500/15 text-accent-600"
                    : state2 === "en_cours"
                      ? "bg-brand-500/15 text-brand-600"
                      : "bg-black/5 text-ink/30"
                }`}
              >
                {state2 === "valide" ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  phase
                )}
              </span>
              <span className={state2 === "a_venir" ? "text-ink/40" : "text-ink/70"}>{name}</span>
            </li>
          );
        })}
      </ol>

      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-3 rounded-lg bg-accent-500/10 px-3 py-2 text-xs text-accent-600">{state.success}</p>
      )}

      {transfer.awaitingCode ? (
        <form action={action} className="mt-3 flex gap-2">
          <input type="hidden" name="transaction_id" value={transfer.id} />
          <input
            name="code"
            inputMode="numeric"
            required
            className="input font-mono tracking-[0.3em]"
            placeholder="000000"
            maxLength={6}
          />
          <SubmitButton className="btn-primary shrink-0 text-sm" pendingLabel="…">
            Confirmer
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          En attente de la validation de la phase {currentPhase} par votre conseiller. Vous recevrez un code par e-mail.
        </p>
      )}
    </div>
  );
}

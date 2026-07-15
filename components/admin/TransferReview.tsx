"use client";

import { useState, useTransition } from "react";
import { startTransferPhase, rejectTransfer } from "@/app/[lang]/admin/actions";
import { TRANSFER_PHASES } from "@/lib/transferPhases";

export type PhaseState = "valide" | "attente" | "a_valider" | "verrouille";

export function TransferReview({
  txId,
  phases,
}: {
  txId: string;
  /** État de chacune des 3 phases (calculé côté serveur). */
  phases: { phase: number; state: PhaseState }[];
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | "reject" | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");

  function validatePhase(phase: number) {
    setFeedback(null);
    setBusy(phase);
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      fd.set("phase", String(phase));
      const res = await startTransferPhase({}, fd);
      setFeedback({ msg: res.error ?? res.success ?? "", ok: !res.error });
      setBusy(null);
    });
  }

  function reject() {
    if (!reason.trim()) {
      setFeedback({ msg: "Un motif de refus est obligatoire.", ok: false });
      return;
    }
    setFeedback(null);
    setBusy("reject");
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      fd.set("reason", reason.trim());
      const res = await rejectTransfer({}, fd);
      setFeedback({ msg: res.error ?? res.success ?? "", ok: !res.error });
      setBusy(null);
    });
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <p className={`rounded-lg px-3 py-2 text-xs ${feedback.ok ? "bg-accent-500/10 text-accent-600" : "bg-red-50 text-red-700"}`}>
          {feedback.msg}
        </p>
      )}

      <ol className="space-y-2">
        {TRANSFER_PHASES.map(({ phase, name, adminLabel }) => {
          const st = phases.find((p) => p.phase === phase)?.state ?? "verrouille";
          return (
            <li key={phase} className="rounded-xl border border-black/[.06] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink/50">Phase {phase}/3</p>
                  <p className="truncate text-sm font-medium text-ink">{name}</p>
                </div>
                <PhaseBadge state={st} />
              </div>

              {st === "a_valider" && (
                <button
                  type="button"
                  onClick={() => validatePhase(phase)}
                  disabled={pending}
                  className="btn-primary mt-2 w-full text-sm disabled:opacity-50"
                >
                  {busy === phase ? "…" : adminLabel}
                </button>
              )}
              {st === "attente" && (
                <button
                  type="button"
                  onClick={() => validatePhase(phase)}
                  disabled={pending}
                  className="btn-outline mt-2 w-full text-sm disabled:opacity-50"
                >
                  {busy === phase ? "…" : "Renvoyer le code"}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Refus (rembourse le client) */}
      {mode === "idle" ? (
        <button
          type="button"
          onClick={() => setMode("reject")}
          disabled={pending}
          className="btn-ghost w-full text-sm text-red-600 hover:bg-red-50"
        >
          Refuser le virement
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="input resize-none text-sm"
            placeholder="Motif du refus (communiqué au client)…"
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" onClick={reject} disabled={pending} className="btn-danger flex-1 text-sm disabled:opacity-50">
              {busy === "reject" ? "…" : "Confirmer le refus"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setReason("");
              }}
              disabled={pending}
              className="btn-ghost text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseBadge({ state }: { state: PhaseState }) {
  const map: Record<PhaseState, { label: string; cls: string }> = {
    valide: { label: "Confirmée", cls: "bg-accent-500/10 text-accent-600" },
    attente: { label: "Attente client", cls: "bg-amber-500/10 text-amber-600" },
    a_valider: { label: "À valider", cls: "bg-brand-500/10 text-brand-600" },
    verrouille: { label: "Verrouillée", cls: "bg-black/5 text-ink/40" },
  };
  const s = map[state];
  return <span className={`badge shrink-0 ${s.cls}`}>{s.label}</span>;
}

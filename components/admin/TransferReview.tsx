"use client";

import { useState, useTransition } from "react";
import { approveTransfer, rejectTransfer } from "@/app/admin/actions";

export function TransferReview({ txId }: { txId: string }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      const res = await approveTransfer({}, fd);
      if (res.error) setError(res.error);
    });
  }

  function reject() {
    if (!reason.trim()) {
      setError("Un motif de refus est obligatoire.");
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      fd.set("reason", reason.trim());
      const res = await rejectTransfer({}, fd);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {mode === "idle" ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="btn-accent flex-1 text-sm disabled:opacity-50"
          >
            {pending ? "…" : "Valider"}
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            disabled={pending}
            className="btn-outline flex-1 text-sm"
          >
            Refuser
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="input resize-none text-sm"
            placeholder="Motif du refus (communiqué au client)…"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reject}
              disabled={pending}
              className="btn-danger flex-1 text-sm disabled:opacity-50"
            >
              {pending ? "…" : "Confirmer le refus"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setReason("");
                setError(null);
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

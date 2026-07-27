"use client";

import { useState, useTransition } from "react";
import { createTransferCode, sendTransferCode, executeTransfer, rejectTransfer } from "@/app/[lang]/admin/actions";

export function TransferReview({
  txId,
  confirmedCount,
  codeState,
  activeLabel,
}: {
  txId: string;
  /** Nombre de codes déjà confirmés par le client. */
  confirmedCount: number;
  /** État du code de l'étape en cours : aucun / créé (non envoyé) / envoyé. */
  codeState: "none" | "created" | "sent";
  /** Motif du code en cours (créé ou envoyé), le cas échéant. */
  activeLabel: string | null;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"create" | "send" | "execute" | "reject" | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");

  function createCode() {
    if (!label.trim()) {
      setFeedback({ msg: "Saisissez un motif / intitulé pour le code.", ok: false });
      return;
    }
    setFeedback(null);
    setBusy("create");
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      fd.set("label", label.trim());
      const res = await createTransferCode({}, fd);
      setFeedback({ msg: res.error ?? res.success ?? "", ok: !res.error });
      if (!res.error) setLabel("");
      setBusy(null);
    });
  }

  function sendCode() {
    setFeedback(null);
    setBusy("send");
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      const res = await sendTransferCode({}, fd);
      setFeedback({ msg: res.error ?? res.success ?? "", ok: !res.error });
      setBusy(null);
    });
  }

  function execute() {
    setFeedback(null);
    setBusy("execute");
    start(async () => {
      const fd = new FormData();
      fd.set("tx_id", txId);
      const res = await executeTransfer({}, fd);
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

      <p className="text-xs text-ink/50">
        {confirmedCount} code(s) confirmé(s) par le client
      </p>

      {codeState === "sent" ? (
        // Code envoyé : on attend que le client le saisisse.
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-medium text-amber-700">Code en attente de confirmation par le client</p>
          {activeLabel && <p className="mt-0.5 truncate text-sm text-ink/70">« {activeLabel} »</p>}
        </div>
      ) : codeState === "created" ? (
        // Code créé mais pas encore envoyé : le champ est visible côté client,
        // l'admin déclenche maintenant l'envoi de l'e-mail.
        <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <p className="text-xs font-medium text-sky-700">Code créé — le champ de saisie est affiché côté client.</p>
          {activeLabel && <p className="truncate text-sm text-ink/70">« {activeLabel} »</p>}
          <button
            type="button"
            onClick={sendCode}
            disabled={pending}
            className="btn-primary w-full text-sm disabled:opacity-50"
          >
            {busy === "send" ? "…" : "Envoyer le code"}
          </button>
        </div>
      ) : (
        // Aucun code en cours : l'admin crée le prochain code (motif libre).
        <div className="space-y-2 rounded-xl border border-black/[.06] p-3">
          <label className="label" htmlFor={`label-${txId}`}>
            Motif / intitulé du code {confirmedCount > 0 ? "suivant" : ""}
          </label>
          <input
            id={`label-${txId}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input text-sm"
            placeholder="Ex : Code de déblocage douanier"
            maxLength={80}
          />
          <button
            type="button"
            onClick={createCode}
            disabled={pending}
            className="btn-primary w-full text-sm disabled:opacity-50"
          >
            {busy === "create" ? "…" : confirmedCount > 0 ? "Créer le code suivant" : "Créer le code"}
          </button>
        </div>
      )}

      {/* Exécuter le virement (débit + exécution) */}
      <button
        type="button"
        onClick={execute}
        disabled={pending}
        className="btn-dark w-full text-sm disabled:opacity-50"
      >
        {busy === "execute" ? "…" : "Exécuter le virement"}
      </button>

      {/* Refus (aucun débit n'a eu lieu) */}
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
              onClick={() => { setMode("idle"); setReason(""); }}
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

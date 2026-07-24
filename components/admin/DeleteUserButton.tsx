"use client";

import { useActionState, useState } from "react";
import { deleteUser, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Suppression définitive d'un profil client. Zone « danger » repliée par défaut ;
 * exige la saisie du mot « SUPPRIMER » (vérifié aussi côté serveur) avant que le
 * bouton ne s'active, pour éviter tout clic accidentel.
 */
export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState<AdminState, FormData>(deleteUser, {});
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const ready = confirm.trim().toUpperCase() === "SUPPRIMER";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-600 hover:text-red-700"
      >
        Supprimer ce profil client
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <p className="text-sm text-ink/70">
        Cette action supprime définitivement le compte de <strong>{name}</strong> et
        toutes ses données (transactions, notifications, documents). Irréversible.
      </p>
      <input type="hidden" name="user_id" value={userId} />
      <div>
        <label className="label" htmlFor="confirm">
          Tapez <span className="font-mono font-semibold">SUPPRIMER</span> pour confirmer
        </label>
        <input
          id="confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
          placeholder="SUPPRIMER"
          autoComplete="off"
        />
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton
          className={`btn text-sm text-white ${ready ? "bg-red-600 hover:bg-red-700" : "cursor-not-allowed bg-red-300"}`}
          pendingLabel="Suppression…"
          disabled={!ready}
        >
          Supprimer définitivement
        </SubmitButton>
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirm(""); }}
          className="btn-ghost text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { createWithdrawalCode, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

type UserOpt = { id: string; label: string };

const STEPS = [0, 10, 20, 50, 100];

export function CreateCodeForm({
  users,
  defaultTarget,
}: {
  users: UserOpt[];
  defaultTarget?: string;
}) {
  const [state, action] = useActionState<AdminState, FormData>(createWithdrawalCode, {});
  const [pct, setPct] = useState(0);

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && state.code && (
        <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-600">Code généré</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-widest text-ink">{state.code}</p>
          <p className="mt-0.5 text-xs text-ink/50">{state.success}</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="name">Nom du code</label>
        <input id="name" name="name" required className="input" placeholder="Ex : Retrait validé — Camille" />
      </div>

      <div>
        <label className="label" htmlFor="code">Valeur du code (laisser vide pour générer)</label>
        <input id="code" name="code" className="input font-mono" placeholder="RETR-XXXX (auto)" />
      </div>

      <div>
        <span className="label">Avancement de la jauge</span>
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPct(v)}
              className={`rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
                pct === v
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-black/10 bg-white text-ink/70 hover:border-black/20"
              }`}
            >
              {v === 0 ? "Auth." : `+${v}%`}
            </button>
          ))}
        </div>
        <input type="hidden" name="percentage_value" value={pct} />
        <p className="mt-1 text-xs text-ink/40">
          « Auth. » = code d&apos;autorisation classique (validation d&apos;un retrait). Les paliers alimentent la jauge.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="target_user_id">Compte cible</label>
        <select id="target_user_id" name="target_user_id" defaultValue={defaultTarget ?? ""} className="input">
          <option value="">Générique (utilisable par n&apos;importe quel compte)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="reason">Motif / contexte (facultatif)</label>
        <input id="reason" name="reason" className="input" placeholder="Ex : validation retrait exceptionnel" />
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Création…">Créer le code</SubmitButton>
    </form>
  );
}

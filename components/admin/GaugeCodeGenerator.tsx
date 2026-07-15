"use client";

import { useActionState, useState } from "react";
import { createWithdrawalCode, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

const STEPS = [10, 20, 50, 100];

export function GaugeCodeGenerator({ userId }: { userId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(createWithdrawalCode, {});
  const [pct, setPct] = useState(20);
  const [copied, setCopied] = useState(false);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible — l'admin peut copier à la main */
    }
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {/* Code généré, mis en avant pour transmission */}
      {state.success && state.code && (
        <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-600">
            Code généré — à transmettre au client
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-ink">
              {state.code}
            </span>
            <button
              type="button"
              onClick={() => copy(state.code!)}
              className="btn-outline shrink-0 text-sm"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/50">{state.success}</p>
        </div>
      )}

      <input type="hidden" name="target_user_id" value={userId} />
      <input type="hidden" name="percentage_value" value={pct} />

      <div>
        <label className="label" htmlFor="name">Nom du code</label>
        <input id="name" name="name" required className="input" placeholder="Ex : Palier retrait — étape 1" />
      </div>

      <div>
        <label className="label" htmlFor="reason">Motif</label>
        <input id="reason" name="reason" className="input" placeholder="Ex : validation partielle du retrait" />
      </div>

      <div>
        <span className="label">Valeur d&apos;avancement de la jauge</span>
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPct(v)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                pct === v
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-black/10 bg-white text-ink/70 hover:border-black/20"
              }`}
            >
              +{v}%
            </button>
          ))}
        </div>
      </div>

      <SubmitButton className="btn-dark w-full" pendingLabel="Génération…">
        Générer et envoyer
      </SubmitButton>
    </form>
  );
}

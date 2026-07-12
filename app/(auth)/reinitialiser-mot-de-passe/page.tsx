"use client";

import { useActionState, useState } from "react";
import { updatePassword, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Nouveau mot de passe</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        Choisissez un nouveau mot de passe pour sécuriser votre compte.
      </p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
          <PasswordChecklist password={password} confirm={confirm} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirmez le mot de passe</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="Répétez le mot de passe"
          />
        </div>
        <SubmitButton pendingLabel="Enregistrement…">Définir le mot de passe</SubmitButton>
      </form>
    </div>
  );
}

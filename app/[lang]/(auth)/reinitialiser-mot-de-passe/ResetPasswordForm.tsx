"use client";

import { useActionState, useState } from "react";
import { updatePassword, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const t = useZone("auth");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t.reset.title}</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        {t.reset.description}
      </p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">{t.reset.newPassword}</label>
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
          <label className="label" htmlFor="confirm">{t.reset.confirmPassword}</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder={t.reset.confirmPlaceholder}
          />
        </div>
        <SubmitButton pendingLabel={t.reset.pending}>{t.reset.submit}</SubmitButton>
      </form>
    </div>
  );
}

"use client";

import { LocaleLink as Link } from "@/components/i18n/navigation";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const t = useZone("auth");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t.forgot.title}</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        {t.forgot.description}
      </p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.info ? (
        <div className="mt-5 rounded-xl border border-accent-500/30 bg-accent-500/5 px-4 py-3 text-sm text-accent-700">
          {state.info}
        </div>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">{t.fields.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t.fields.emailPlaceholder} />
          </div>
          <SubmitButton pendingLabel={t.forgot.pending}>{t.forgot.submit}</SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/60">
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          {t.forgot.backToLogin}
        </Link>
      </p>
    </div>
  );
}

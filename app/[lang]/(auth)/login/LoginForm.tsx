"use client";

import { LocaleLink as Link } from "@/components/i18n/navigation";
import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useZone } from "@/components/i18n/DictionaryProvider";

function LoginFormInner() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});
  const next = useSearchParams().get("next") ?? "/dashboard";
  const t = useZone("auth");
  const c = useZone("common");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t.login.title}</h1>
      <p className="mt-1.5 text-sm text-ink/60">{t.login.subtitle}</p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">{t.fields.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t.fields.emailPlaceholder} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.fields.password}</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder={t.fields.passwordPlaceholder} />
          <div className="mt-1.5 text-right">
            <Link href="/mot-de-passe-oublie" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {t.login.forgotPassword}
            </Link>
          </div>
        </div>
        <SubmitButton pendingLabel={t.login.pending}>{t.login.submit}</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        {t.login.noAccount}{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          {c.actions.register}
        </Link>
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

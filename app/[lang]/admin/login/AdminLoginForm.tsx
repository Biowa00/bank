"use client";

import { LocaleLink as Link } from "@/components/i18n/navigation";
import { useActionState } from "react";
import { signInAdmin, type AuthState } from "@/app/[lang]/(auth)/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Logo } from "@/components/Logo";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function AdminLoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(signInAdmin, {});
  const t = useZone("auth");
  const c = useZone("common");

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo variant="light" href={null} />
          <span className="badge bg-white/10 text-white/70">{t.adminLogin.badge}</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink">{t.adminLogin.title}</h1>
          <p className="mt-1 text-sm text-ink/60">{t.adminLogin.subtitle}</p>

          {state.error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">{t.adminLogin.emailLabel}</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="admin@vantexx.online" />
            </div>
            <div>
              <label className="label" htmlFor="password">{t.fields.password}</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder={t.fields.passwordPlaceholder} />
            </div>
            <SubmitButton className="btn-dark w-full py-3 text-base" pendingLabel={t.adminLogin.pending}>
              {t.adminLogin.submit}
            </SubmitButton>
          </form>

          <p className="mt-5 text-center">
            <Link href="/mot-de-passe-oublie" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {t.login.forgotPassword}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          <Link href="/" className="hover:text-white/70">{c.actions.backToSite}</Link>
        </p>
      </div>
    </div>
  );
}

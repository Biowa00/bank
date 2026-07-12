"use client";

import Link from "next/link";
import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Content de vous revoir</h1>
      <p className="mt-1.5 text-sm text-ink/60">Connectez-vous à votre espace Nébula.</p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="vous@exemple.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" />
          <div className="mt-1.5 text-right">
            <Link href="/mot-de-passe-oublie" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
        <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAdmin, type AuthState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  const [state, action] = useActionState<AuthState, FormData>(signInAdmin, {});

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo variant="light" href={null} />
          <span className="badge bg-white/10 text-white/70">Espace administrateur</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink">Connexion admin</h1>
          <p className="mt-1 text-sm text-ink/60">Accès réservé au personnel autorisé.</p>

          {state.error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mail administrateur</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="admin@nebula.demo" />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" />
            </div>
            <SubmitButton className="btn-dark w-full py-3 text-base" pendingLabel="Vérification…">
              Accéder au backoffice
            </SubmitButton>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          <Link href="/" className="hover:text-white/70">← Retour au site</Link>
        </p>
      </div>
    </div>
  );
}

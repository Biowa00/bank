"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type AuthState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const dialCodes = [
  { code: "+33", label: "France (+33)" },
  { code: "+32", label: "Belgique (+32)" },
  { code: "+41", label: "Suisse (+41)" },
  { code: "+352", label: "Luxembourg (+352)" },
  { code: "+1", label: "Canada / USA (+1)" },
  { code: "+34", label: "Espagne (+34)" },
  { code: "+39", label: "Italie (+39)" },
  { code: "+49", label: "Allemagne (+49)" },
  { code: "+212", label: "Maroc (+212)" },
  { code: "+213", label: "Algérie (+213)" },
  { code: "+216", label: "Tunisie (+216)" },
  { code: "+225", label: "Côte d'Ivoire (+225)" },
  { code: "+221", label: "Sénégal (+221)" },
  { code: "+44", label: "Royaume-Uni (+44)" },
];

export default function RegisterPage() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});
  const [fileName, setFileName] = useState<string>("");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Créer votre compte</h1>
      <p className="mt-1.5 text-sm text-ink/60">
        Renseignez vos informations pour ouvrir votre compte.
      </p>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.info && (
        <p className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {state.info}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="last_name">Nom de famille *</label>
            <input id="last_name" name="last_name" required className="input" placeholder="Garcia" />
          </div>
          <div>
            <label className="label" htmlFor="first_name">Nom *</label>
            <input id="first_name" name="first_name" required className="input" placeholder="Juan" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">Ville *</label>
            <input id="city" name="city" required className="input" placeholder="Madrid" />
          </div>
          <div>
            <label className="label" htmlFor="profession">Profession *</label>
            <input id="profession" name="profession" required className="input" placeholder="Ingénieur" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="address">Adresse complète *</label>
          <input id="address" name="address" required className="input" placeholder="Calle Mayor 12, 28001 Madrid" />
        </div>

        <div>
          <label className="label" htmlFor="phone">Numéro de téléphone *</label>
          <div className="flex gap-2">
            <select name="dial_code" defaultValue="+33" className="input w-40 shrink-0" aria-label="Indicatif pays">
              {dialCodes.map((d) => (
                <option key={d.code + d.label} value={d.code}>{d.label}</option>
              ))}
            </select>
            <input id="phone" name="phone" type="tel" required className="input" placeholder="0 00 00 00 00" />
          </div>
          <p className="mt-1 text-xs text-ink/40">Format attendu : +33 0 00 00 00 00 (9 chiffres)</p>
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail *</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="exemple@email.com" />
        </div>

        <div>
          <label className="label" htmlFor="id_document">Pièce d&apos;identité (photo) *</label>
          <label
            htmlFor="id_document"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-black/15 bg-white px-4 py-3 text-sm transition-colors hover:border-brand-400 hover:bg-brand-50/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-ink/70">
              {fileName || "Choisir un fichier…"}
            </span>
          </label>
          <input
            id="id_document"
            name="id_document"
            type="file"
            required
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <p className="mt-1 text-xs text-ink/40">Formats acceptés : JPG, PNG, PDF — 5 Mo maximum</p>
        </div>

        <div>
          <label className="label" htmlFor="password">Mot de passe *</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="••••••••" />
          <p className="mt-1 text-xs text-ink/40">8 caractères minimum, 1 lettre majuscule, 1 chiffre</p>
        </div>

        <div>
          <label className="label" htmlFor="confirm">Confirmez le mot de passe *</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" placeholder="Répétez le mot de passe" />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/70">
          <input type="checkbox" name="cgu" value="1" required className="mt-0.5 h-4 w-4 rounded border-black/20 text-brand-600 focus:ring-brand-500" />
          <span>
            J&apos;accepte les{" "}
            <span className="font-medium text-brand-600">conditions générales</span> et la{" "}
            <span className="font-medium text-brand-600">politique de confidentialité</span>.
          </span>
        </label>

        <SubmitButton pendingLabel="Création…">Créer mon compte</SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-ink/60">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

"use client";

import { checkPassword } from "@/lib/password";
import { useZone } from "@/components/i18n/DictionaryProvider";

/**
 * Liste des règles de mot de passe mise à jour en temps réel.
 * S'affiche dès que l'utilisateur commence à saisir.
 */
export function PasswordChecklist({
  password,
  confirm,
}: {
  password: string;
  confirm?: string;
}) {
  const rules = useZone("auth").passwordRules;
  if (!password) return null;

  const items = checkPassword(password).map((it) => ({
    label: rules[it.key],
    ok: it.ok,
  }));
  if (confirm !== undefined) {
    items.push({
      label: rules.match,
      ok: confirm.length > 0 && password === confirm,
    });
  }

  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {items.map((it) => (
        <li
          key={it.label}
          className={`flex items-center gap-2 text-xs transition-colors ${
            it.ok ? "text-accent-600" : "text-ink/40"
          }`}
        >
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
              it.ok ? "bg-accent-500/15 text-accent-600" : "bg-black/5 text-ink/30"
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              {it.ok ? (
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              )}
            </svg>
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

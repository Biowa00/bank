"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { locales, localeNames, isLocale, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/i18n/navigation";

/**
 * Sélecteur de langue toujours visible. Mémorise le choix dans le cookie
 * `NEXT_LOCALE` et remplace le préfixe de langue de l'URL courante (en
 * conservant le reste du chemin et les paramètres de requête).
 */
export function LanguageSwitcher({
  className = "",
  variant = "light",
}: {
  className?: string;
  /** "light" : texte sombre (fonds clairs) ; "dark" : texte clair (fonds sombres). */
  variant?: "light" | "dark";
}) {
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === current) return;

    // Le cookie `NEXT_LOCALE` est (re)posé par le proxy dès que l'URL visitée
    // porte une langue différente de celle mémorisée — le choix est donc
    // persisté par la navigation ci-dessous, sans écriture cookie côté client.

    // Remplace le premier segment (langue) de l'URL, conserve le reste + query.
    const segments = (pathname ?? "/").split("/");
    if (isLocale(segments[1])) segments[1] = next;
    else segments.splice(1, 0, next);
    // La query n'est lue qu'au clic (côté client) pour ne pas forcer le rendu
    // dynamique des pages statiques via useSearchParams.
    const qs = typeof window !== "undefined" ? window.location.search : "";
    const target = segments.join("/") + qs;

    router.push(target);
    router.refresh();
  }

  const textCls =
    variant === "dark"
      ? "text-white/70 hover:text-white"
      : "text-ink/60 hover:text-ink";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localeNames[current]}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${textCls}`}
      >
        <GlobeIcon />
        <span>{current.toUpperCase()}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 max-h-72 w-44 overflow-auto rounded-xl border border-black/10 bg-white p-1 text-ink shadow-xl"
        >
          {locales.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                role="option"
                aria-selected={loc === current}
                onClick={() => selectLocale(loc)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/[.04] ${
                  loc === current ? "font-semibold text-brand-600" : "text-ink/80"
                }`}
              >
                <span>{localeNames[loc]}</span>
                <span className="text-xs text-ink/40">{loc.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3C9.5 5.5 9.5 18.5 12 21" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

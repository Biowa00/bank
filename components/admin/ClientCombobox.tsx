"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ClientOption = { id: string; label: string };

/**
 * Sélecteur de client recherchable (remplace un <select> natif qui pouvait mal
 * se comporter avec beaucoup d'options / sur desktop). Filtre par nom ou email,
 * et écrit l'id choisi dans un champ caché `name` soumis avec le formulaire.
 * L'option vide en tête = code générique (utilisable par n'importe quel compte).
 */
export function ClientCombobox({
  name,
  users,
  defaultValue = "",
  genericLabel,
  placeholder = "Rechercher un client…",
}: {
  name: string;
  users: ClientOption[];
  defaultValue?: string;
  genericLabel: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = users.find((u) => u.id === value) ?? null;

  // Ferme au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.label.toLowerCase().includes(q));
  }, [query, users]);

  const display = selected ? selected.label : genericLabel;

  function choose(id: string) {
    setValue(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? "text-ink" : "text-ink/50"}`}>{display}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-black/10 bg-white p-1.5 shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="mb-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <ul role="listbox" className="max-h-60 overflow-auto">
            <li>
              <button
                type="button"
                onClick={() => choose("")}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[.04] ${value === "" ? "font-semibold text-brand-600" : "text-ink/70"}`}
              >
                {genericLabel}
              </button>
            </li>
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => choose(u.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[.04] ${u.id === value ? "font-semibold text-brand-600" : "text-ink/80"}`}
                >
                  {u.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink/40">Aucun client trouvé.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type DictionaryContextValue = {
  lang: Locale;
  dict: Dictionary;
};

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

/**
 * Rend le dictionnaire de la langue courante disponible aux composants client.
 * Monté une fois dans le layout racine, hydraté avec le dictionnaire résolu
 * côté serveur (JSON pur, donc sérialisable).
 */
export function DictionaryProvider({
  lang,
  dict,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={{ lang, dict }}>
      {children}
    </DictionaryContext.Provider>
  );
}

/** Accès au dictionnaire complet + langue dans un composant client. */
export function useDictionary(): DictionaryContextValue {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error(
      "useDictionary doit être utilisé à l'intérieur d'un <DictionaryProvider>.",
    );
  }
  return ctx;
}

/** Raccourci vers une zone du dictionnaire (ex. `useZone(\"dashboard\")`). */
export function useZone<Z extends keyof Dictionary>(zone: Z): Dictionary[Z] {
  return useDictionary().dict[zone];
}

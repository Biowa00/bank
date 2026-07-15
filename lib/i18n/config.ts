/**
 * Configuration centrale de l'internationalisation.
 *
 * Ce module est importé aussi bien côté serveur (proxy, dictionnaires) que côté
 * client (sélecteur de langue, provider). Il ne doit donc PAS importer
 * `server-only` ni de dépendance serveur.
 */

/** Les 13 langues cibles. `fr` est la langue source et le repli. */
export const locales = [
  "fr",
  "de",
  "es",
  "en",
  "it",
  "pl",
  "sl",
  "pt",
  "bg",
  "sk",
  "cs",
  "el",
  "hu",
] as const;

export type Locale = (typeof locales)[number];

/** Langue par défaut et repli quand la détection échoue. */
export const defaultLocale: Locale = "fr";

/** Nom du cookie qui mémorise le choix de langue de l'utilisateur. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Durée de vie du cookie de langue (~1 an, en secondes). */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Garde de type : `x` est-il une locale supportée ? */
export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (locales as readonly string[]).includes(x);
}

/** Remplace les jetons `{clé}` d'un gabarit par les valeurs fournies. */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

/**
 * Noms natifs des langues, pour le sélecteur (l'utilisateur reconnaît sa langue
 * même si l'interface est dans une autre).
 */
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  en: "English",
  it: "Italiano",
  pl: "Polski",
  sl: "Slovenščina",
  pt: "Português",
  bg: "Български",
  sk: "Slovenčina",
  cs: "Čeština",
  el: "Ελληνικά",
  hu: "Magyar",
};

/**
 * Tag BCP-47 par locale, utilisé par les API `Intl` (formatage nombres/dates).
 */
export const intlLocale: Record<Locale, string> = {
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  en: "en-GB",
  it: "it-IT",
  pl: "pl-PL",
  sl: "sl-SI",
  pt: "pt-PT",
  bg: "bg-BG",
  sk: "sk-SK",
  cs: "cs-CZ",
  el: "el-GR",
  hu: "hu-HU",
};

/**
 * Correspondance pays (ISO-3166 alpha-2) → langue, pour affiner la détection
 * via la géolocalisation IP (header `x-vercel-ip-country`). Les pays non
 * répertoriés retombent sur `defaultLocale`.
 */
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  // Français
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  // Allemand
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  // Espagnol
  ES: "es",
  // Anglais
  GB: "en",
  IE: "en",
  // Italien
  IT: "it",
  // Polonais
  PL: "pl",
  // Slovène
  SI: "sl",
  // Portugais
  PT: "pt",
  // Bulgare
  BG: "bg",
  // Slovaque
  SK: "sk",
  // Tchèque
  CZ: "cs",
  // Grec
  GR: "el",
  CY: "el",
  // Hongrois
  HU: "hu",
};

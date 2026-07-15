import "server-only";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";

// Le dictionnaire français est la source : importé statiquement, il sert à la
// fois de type de référence (parité des clés) et de repli quand une traduction
// est absente.
import frCommon from "./dictionaries/fr/common.json";
import frLanding from "./dictionaries/fr/landing.json";
import frAuth from "./dictionaries/fr/auth.json";
import frDashboard from "./dictionaries/fr/dashboard.json";
import frAdmin from "./dictionaries/fr/admin.json";
import frEmails from "./dictionaries/fr/emails.json";
import frErrors from "./dictionaries/fr/errors.json";

const FR = {
  common: frCommon,
  landing: frLanding,
  auth: frAuth,
  dashboard: frDashboard,
  admin: frAdmin,
  emails: frEmails,
  errors: frErrors,
};

/** Forme complète d'un dictionnaire, dérivée du français (source de vérité). */
export type Dictionary = typeof FR;
export type Zone = keyof Dictionary;

const ZONES = Object.keys(FR) as Zone[];

/** Charge un fichier de zone pour une langue, avec repli sur le français. */
async function loadZone<Z extends Zone>(
  locale: Locale,
  zone: Z,
): Promise<Dictionary[Z]> {
  if (locale === defaultLocale) return FR[zone];
  try {
    const mod = await import(`./dictionaries/${locale}/${zone}.json`);
    // On fusionne au-dessus du français pour combler d'éventuelles clés
    // manquantes (traduction partielle) plutôt que d'exposer `undefined`.
    return { ...FR[zone], ...(mod.default as object) } as Dictionary[Z];
  } catch {
    return FR[zone];
  }
}

/**
 * Dictionnaire complet pour une langue. Les composants serveur l'appellent
 * directement ; le résultat (JSON pur) est aussi passé au provider client.
 */
export async function getDictionary(locale: string): Promise<Dictionary> {
  // `lang` provient de l'URL (typé `string`) ; on normalise vers une locale
  // supportée (le layout renvoie déjà un 404 pour les valeurs inconnues).
  const loc: Locale = isLocale(locale) ? locale : defaultLocale;
  const entries = await Promise.all(
    ZONES.map(async (zone) => [zone, await loadZone(loc, zone)] as const),
  );
  return Object.fromEntries(entries) as Dictionary;
}

/**
 * Dictionnaire de la langue courante déduite du cookie (posé par le proxy).
 * Pratique dans les composants serveur qui n'ont pas `params` sous la main.
 */
export async function getRequestDictionary(): Promise<Dictionary> {
  return getDictionary(await getRequestLocale());
}

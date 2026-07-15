import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import type { NextRequest } from "next/server";
import {
  COUNTRY_TO_LOCALE,
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from "./config";

/**
 * Détermine la langue préférée pour une requête, par ordre de priorité :
 *   1. Cookie de choix explicite (`NEXT_LOCALE`)
 *   2. Préférences du navigateur (header `Accept-Language`)
 *   3. Géolocalisation IP par pays (header Vercel `x-vercel-ip-country`)
 *   4. Langue par défaut (`fr`)
 */
export function getLocale(request: NextRequest): Locale {
  // 1. Choix mémorisé — priorité absolue.
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // 2. Préférences du navigateur.
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const languages = new Negotiator({
      headers: { "accept-language": acceptLanguage },
    }).languages();
    try {
      // `match` lève si `languages` contient une valeur invalide (ex. "*").
      const matched = match(languages, locales as unknown as string[], "");
      if (isLocale(matched)) return matched;
    } catch {
      // On ignore et on passe au repli géographique.
    }
  }

  // 3. Pays estimé via l'IP (uniquement peuplé sur Vercel).
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (country && COUNTRY_TO_LOCALE[country]) {
    return COUNTRY_TO_LOCALE[country];
  }

  // 4. Repli.
  return defaultLocale;
}

/** Extrait la locale d'un pathname déjà préfixé (`/de/dashboard` → `de`). */
export function localeFromPathname(pathname: string): Locale | null {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
}

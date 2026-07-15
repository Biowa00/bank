import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Langue courante côté serveur (server components, server actions, route
 * handlers), lue depuis le cookie `NEXT_LOCALE` posé par le proxy. Repli sur
 * la langue par défaut.
 */
export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Redirige vers un chemin logique (`/dashboard`) en le préfixant de la langue
 * courante (`/de/dashboard`). À utiliser dans les server actions et gardes.
 */
export async function localizedRedirect(path: string): Promise<never> {
  const locale = await getRequestLocale();
  redirect(`/${locale}${path}`);
}

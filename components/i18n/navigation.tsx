"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

/** Langue courante, lue depuis le segment `[lang]` de l'URL. */
export function useLocale(): Locale {
  const params = useParams();
  const lang = params?.lang;
  return isLocale(lang) ? lang : defaultLocale;
}

/**
 * Préfixe un chemin interne (`/dashboard`) de la langue (`/de/dashboard`).
 * Les liens externes, ancres (`#`) et chemins déjà préfixés passent tels quels.
 */
export function localizeHref(lang: Locale, href: string): string {
  if (!href.startsWith("/")) return href; // externe, ancre, relatif
  const first = href.split("/")[1];
  if (isLocale(first)) return href; // déjà préfixé
  return `/${lang}${href}`;
}

/**
 * Pathname « logique », sans le préfixe de langue (`/de/dashboard/depot` →
 * `/dashboard/depot`). Pratique pour l'état actif des menus.
 */
export function useLogicalPathname(): string {
  const pathname = usePathname() ?? "/";
  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    const stripped = pathname.slice(first.length + 1);
    return stripped || "/";
  }
  return pathname;
}

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * `next/link` conscient de la langue : réécrit automatiquement un `href`
 * commençant par `/` avec le préfixe de la locale courante. Utilisable dans les
 * composants serveur comme client (c'est un composant client).
 */
export const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  function LocaleLink({ href, ...props }, ref) {
    const lang = useLocale();
    return <Link ref={ref} href={localizeHref(lang, href)} {...props} />;
  },
);

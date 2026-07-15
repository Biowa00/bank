import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getLocale, localeFromPathname } from "@/lib/i18n/detect";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";

/**
 * Chemins servis tels quels, sans préfixe de langue : endpoints machine
 * (callback d'auth) qui ne rendent pas d'UI.
 */
function isExemptPath(pathname: string): boolean {
  return pathname.startsWith("/auth/callback") || pathname.startsWith("/api");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Endpoints machine : on rafraîchit juste la session Supabase, sans i18n.
  if (isExemptPath(pathname)) {
    return await updateSession(request, null);
  }

  // 2. Pas de préfixe de langue → on détecte et on redirige une seule fois.
  const locale = localeFromPathname(pathname);
  if (!locale) {
    const detected = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);
    // On mémorise la langue détectée pour les visites suivantes.
    response.cookies.set(LOCALE_COOKIE, detected, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return response;
  }

  // 3. Préfixe présent → gestion de session + gating d'auth (locale-aware).
  const response = await updateSession(request, locale);
  // On garde le cookie synchronisé avec l'URL réellement visitée.
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf : fichiers statiques, images, favicon.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

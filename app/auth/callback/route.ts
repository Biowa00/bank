import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { safeNextPath } from "@/lib/safeRedirect";

/**
 * Échange le `code` reçu par email (récupération de mot de passe, confirmation)
 * contre une session, puis redirige vers `next` (déjà préfixé de la langue).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Langue de repli pour les cibles par défaut : cookie du visiteur, sinon fr.
  const cookieLocale = request.headers
    .get("cookie")
    ?.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`))?.[1];
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = safeNextPath(next, `/${locale}/dashboard`);
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/${locale}/login?error=lien-invalide`,
  );
}

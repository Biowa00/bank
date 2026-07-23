"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { headers } from "next/headers";

/**
 * Vérifie le lien (signup / recovery / …) UNIQUEMENT quand l'utilisateur
 * clique réellement sur le bouton de la page /auth/confirm (Server Action —
 * requiert un vrai geste utilisateur, jamais déclenché par un simple GET).
 * C'est ce qui protège du pré-chargement des liens par certains clients mail
 * (Apple Mail / Safari Link Tracking Protection), qui consommerait sinon le
 * lien à usage unique avant le clic réel et ferait échouer la confirmation.
 *
 * Deux formats de lien selon le gabarit d'email réellement actif côté
 * Supabase : `token_hash`+`type` (gabarit personnalisé → verifyOtp) ou
 * `code` (gabarit par défaut / flux PKCE → exchangeCodeForSession).
 */
export async function confirmEmail(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "");

  const cookieLocale = (await headers())
    .get("cookie")
    ?.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`))?.[1];
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  if (!code && (!tokenHash || !type)) {
    redirect(`/${locale}/login?error=lien-invalide`);
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: type as "signup" | "recovery" | "invite" | "email_change" | "magiclink" | "email",
        token_hash: tokenHash,
      });

  if (error) {
    redirect(`/${locale}/login?error=lien-invalide`);
  }

  const safeNext = next && next.startsWith("/") ? next : `/${locale}/dashboard`;
  redirect(safeNext);
}

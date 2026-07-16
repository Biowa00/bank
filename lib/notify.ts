import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/i18n/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/app/[lang]/dictionaries";

export type NotifyOptions = {
  /**
   * Envoyer aussi un email (best-effort) en plus de la notification in-app.
   * Activé par défaut : passer `email: false` pour une notif purement in-app.
   */
  email?: boolean;
  /** Bouton d'action optionnel dans l'email. */
  cta?: { label: string; url: string };
};

/** Insère la notification in-app puis envoie l'email dans la langue donnée. */
async function deliver(
  userId: string,
  title: string,
  body: string,
  locale: Locale,
  opts: NotifyOptions,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({ user_id: userId, title, body });

  if (opts.email === false) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle<{ email: string | null; full_name: string | null }>();

  if (!profile?.email) return;

  const chrome = (await getDictionary(locale)).emails.chrome;

  await sendEmail({
    to: profile.email,
    subject: title,
    html: renderNotificationEmail({
      title,
      body,
      name: profile.full_name,
      ctaLabel: opts.cta?.label,
      ctaUrl: opts.cta?.url,
      locale,
      chrome,
    }),
    text: body,
  });
}

/**
 * Langue préférée du destinataire : mémorisée dans les métadonnées auth
 * (posée à l'inscription et rafraîchie à chaque connexion), avec repli sur
 * la langue de la requête courante.
 */
async function getUserLocale(userId: string): Promise<Locale> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const stored = data?.user?.user_metadata?.locale;
  return isLocale(stored) ? stored : await getRequestLocale();
}

/**
 * Crée une notification in-app et, sauf `email: false`, envoie un email
 * transactionnel via l'Edge Function. L'échec d'email n'interrompt jamais
 * l'action métier appelante.
 *
 * Le titre/corps fournis sont déjà rendus dans la langue de l'utilisateur
 * ACTIF : à réserver aux actions déclenchées par le destinataire lui-même.
 * Pour les actions admin, préférer `notifyUser` (langue du destinataire).
 */
export async function notify(
  userId: string,
  title: string,
  body: string,
  opts: NotifyOptions = {},
): Promise<void> {
  const locale = await getRequestLocale();
  await deliver(userId, title, body, locale, opts);
}

/**
 * Variante pour les actions ADMIN : le titre/corps sont construits via le
 * dictionnaire de la langue du DESTINATAIRE, pas celle de l'admin. `build`
 * reçoit ce dictionnaire et la locale (pour formater montants/dates).
 */
export async function notifyUser(
  userId: string,
  build: (dict: Dictionary, locale: Locale) => { title: string; body: string },
  opts: NotifyOptions = {},
): Promise<void> {
  const locale = await getUserLocale(userId);
  const dict = await getDictionary(locale);
  const { title, body } = build(dict, locale);
  await deliver(userId, title, body, locale, opts);
}

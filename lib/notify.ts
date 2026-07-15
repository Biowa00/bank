import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/app/[lang]/dictionaries";

export type NotifyOptions = {
  /**
   * Envoyer aussi un email (best-effort) en plus de la notification in-app.
   * Activé par défaut : passer `email: false` pour une notif purement in-app.
   */
  email?: boolean;
  /** Bouton d'action optionnel dans l'email. */
  cta?: { label: string; url: string };
};

/**
 * Crée une notification in-app et, sauf `email: false`, envoie un email
 * transactionnel via l'Edge Function. L'échec d'email n'interrompt jamais
 * l'action métier appelante.
 */
export async function notify(
  userId: string,
  title: string,
  body: string,
  opts: NotifyOptions = {},
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

  // Le titre/corps sont déjà rendus dans la langue de l'utilisateur actif ;
  // on aligne le chrome (en-tête, salutation, pied) et l'attribut <html lang>
  // sur cette même langue pour un e-mail cohérent.
  const locale = await getRequestLocale();
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

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderNotificationEmail } from "@/lib/email";

export type NotifyOptions = {
  /** Envoyer aussi un email (best-effort) en plus de la notification in-app. */
  email?: boolean;
  /** Bouton d'action optionnel dans l'email. */
  cta?: { label: string; url: string };
};

/**
 * Crée une notification in-app et, si `email: true`, envoie un email
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

  if (!opts.email) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle<{ email: string | null; full_name: string | null }>();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: title,
    html: renderNotificationEmail({
      title,
      body,
      name: profile.full_name,
      ctaLabel: opts.cta?.label,
      ctaUrl: opts.cta?.url,
    }),
    text: body,
  });
}

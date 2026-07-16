/**
 * Envoi d'emails transactionnels via l'Edge Function Supabase `send-email`
 * (qui relaie vers Resend). Best-effort : un échec d'email ne doit JAMAIS
 * faire échouer l'action métier appelante.
 */

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/** Invoque l'Edge Function avec la clé service_role (jamais exposée au client). */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    console.warn("[email] Supabase non configuré — email ignoré.");
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] échec envoi:", res.status, detail);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exception:", err);
    return { ok: false, error: String(err) };
  }
}

/** Textes fixes (chrome) de l'e-mail, traduits selon la langue du destinataire. */
export type EmailChrome = {
  greeting: string;
  greetingNoName: string;
  header: string;
  footerAuto: string;
  footerConfidential: string;
};

/** Gabarit HTML sobre et responsive, réutilisable pour toute notification. */
export function renderNotificationEmail(params: {
  title: string;
  body: string;
  name?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Code langue BCP-47 court (ex. "fr", "de") pour l'attribut `<html lang>`. */
  locale?: string;
  /** Textes fixes traduits ; repli sur le français si absent. */
  chrome?: EmailChrome;
}): string {
  const { title, body, name, ctaLabel, ctaUrl, locale = "fr" } = params;
  const chrome: EmailChrome = params.chrome ?? {
    greeting: "Bonjour {name},",
    greetingNoName: "Bonjour,",
    header: "Vantex Bank",
    footerAuto: "Ceci est un message automatique, merci de ne pas y répondre.",
    footerConfidential: "Cet e-mail et les informations qu'il contient sont confidentiels.",
  };
  const greeting = name
    ? chrome.greeting.replace("{name}", escapeHtml(name))
    : chrome.greetingNoName;
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 0 4px">
           <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:9999px">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="${escapeAttr(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f7f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0b12">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7fb;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(10,10,20,.06)">
        <tr><td style="background:#0b0b12;padding:20px 24px">
          <span style="color:#fff;font-weight:700;font-size:16px;letter-spacing:.02em">${escapeHtml(chrome.header)}</span>
        </td></tr>
        <tr><td style="padding:28px 24px">
          <p style="margin:0 0 4px;color:#6b6b76;font-size:14px">${greeting}</p>
          <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3">${escapeHtml(title)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#26262e">${escapeHtml(body)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid rgba(10,10,20,.06)">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9a9aa2">
            ${escapeHtml(chrome.footerAuto)}<br>
            © ${escapeHtml(chrome.header)}. ${escapeHtml(chrome.footerConfidential)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

// =============================================================
//  Edge Function : send-email
//  Envoie un email transactionnel via Resend.
//  Appelée côté serveur (Server Actions) avec la clé service_role.
//
//  Secrets à définir (Supabase > Edge Functions > Secrets) :
//    RESEND_API_KEY  = re_xxx           (clé API Resend)
//    EMAIL_FROM      = "Vantex Bank S.A <onboarding@resend.dev>"
//  SUPABASE_SERVICE_ROLE_KEY est injecté automatiquement par Supabase.
//
//  Déploiement :
//    supabase functions deploy send-email --project-ref ogqopkjpygrucruivpol
// =============================================================

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  // --- Authentification : seul un appel avec la clé service_role est accepté.
  // verify_jwt (gateway) valide la signature ; on exige ici le rôle service_role
  // via le claim du JWT (indépendant de l'injection d'env).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let role = "";
  try {
    role = JSON.parse(atob(token.split(".")[1] ?? "")).role ?? "";
  } catch {
    role = "";
  }
  if (role !== "service_role")
    return json({ error: "Unauthorized" }, 401);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Vantex Bank S.A <onboarding@resend.dev>";
  if (!apiKey)
    return json({ error: "RESEND_API_KEY manquant côté fonction" }, 500);

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }
  if (!payload.to || !payload.subject || !payload.html)
    return json({ error: "Champs requis : to, subject, html" }, 400);

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    return json({ error: "Échec Resend", detail: data }, 502);

  return json({ ok: true, id: data.id ?? null }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

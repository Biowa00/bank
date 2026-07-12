import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase "service_role" — CONTOURNE la RLS.
 * ⚠️ À n'utiliser QUE côté serveur (Server Actions / Route Handlers),
 * jamais dans un composant client. Sert aux mutations sensibles :
 * dépôt, virement, retrait, actions admin.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

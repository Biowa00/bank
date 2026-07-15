import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localizedRedirect } from "@/lib/i18n/server";
import type { Profile } from "@/lib/types";

/** Récupère l'utilisateur connecté et son profil (ou null). */
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile };
}

/** Exige une session CLIENT, sinon redirige. L'admin n'a pas d'espace client. */
export async function requireUser() {
  const session = await getSessionProfile();
  if (!session) await localizedRedirect("/login");
  if (session!.profile.role === "admin") await localizedRedirect("/admin");
  return session!;
}

/** Exige un admin, sinon redirige. */
export async function requireAdmin() {
  const session = await getSessionProfile();
  if (!session) await localizedRedirect("/admin/login");
  if (session!.profile.role !== "admin") await localizedRedirect("/dashboard");
  return session!;
}

/**
 * Vérifie l'identité côté server action et renvoie le profil FRAIS
 * (lu via la clé service pour être fiable). Lève si non connecté.
 */
export async function getVerifiedProfile(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) throw new Error("Profil introuvable.");

  return { userId: user.id, email: user.email ?? profile.email, profile };
}

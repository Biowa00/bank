"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPasswordValid } from "@/lib/password";
import { getRequestLocale, localizedRedirect } from "@/lib/i18n/server";
import { safeNextPath } from "@/lib/safeRedirect";
import { getDictionary, type Dictionary } from "../dictionaries";

export type AuthState = {
  error?: string;
  info?: string;
};

/** Dictionnaire d'erreurs auth de la langue courante. */
async function authErrors(): Promise<Dictionary["errors"]["auth"]> {
  const dict = await getDictionary(await getRequestLocale());
  return dict.errors.auth;
}

/** Reconstruit l'origine (protocole + hôte) de la requête courante. */
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png"];
// Les fonctions serverless Vercel refusent (413) les requêtes dont le corps
// dépasse ~4,5 Mo ; on plafonne chaque fichier bien en-dessous pour que la
// pièce d'identité (non compressible côté client si PDF) et le selfie
// combinés ne s'approchent jamais de cette limite.
const MAX_DOC_SIZE = 3 * 1024 * 1024; // 3 Mo

/** Inscription client. Le profil + IBAN sont créés par un trigger SQL. */
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const lastName = String(formData.get("last_name") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const profession = String(formData.get("profession") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dialCode = String(formData.get("dial_code") ?? "").trim();
  const phoneNumber = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const cgu = formData.get("cgu");
  const doc = formData.get("id_document");
  const selfie = formData.get("selfie");

  const E = await authErrors();

  // Champs requis
  if (!lastName) return { error: E.lastNameRequired };
  if (!firstName) return { error: E.firstNameRequired };
  if (!city) return { error: E.cityRequired };
  if (!profession) return { error: E.professionRequired };
  if (!address) return { error: E.addressRequired };
  if (!phoneNumber) return { error: E.phoneRequired };
  if (!email) return { error: E.emailRequired };

  // Mot de passe : 8 caractères min, 1 majuscule, 1 chiffre
  if (password.length < 8) return { error: E.passwordMinLength };
  if (!/[A-Z]/.test(password)) return { error: E.passwordUppercase };
  if (!/[0-9]/.test(password)) return { error: E.passwordDigit };
  if (password !== confirm) return { error: E.passwordsMismatch };

  if (!cgu) return { error: E.cguRequired };

  // Pièce d'identité
  if (!(doc instanceof File) || doc.size === 0) return { error: E.idRequired };
  if (!ALLOWED_DOC_TYPES.includes(doc.type)) return { error: E.idFormat };
  if (doc.size > MAX_DOC_SIZE) return { error: E.idTooLarge };

  // Selfie (capturé en direct côté client → toujours une image).
  if (!(selfie instanceof File) || selfie.size === 0) return { error: E.selfieRequired };
  if (!ALLOWED_SELFIE_TYPES.includes(selfie.type)) return { error: E.selfieRequired };
  if (selfie.size > MAX_DOC_SIZE) return { error: E.idTooLarge };

  const phone = dialCode ? `${dialCode} ${phoneNumber}` : phoneNumber;

  const origin = await getOrigin();
  const locale = await getRequestLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Page intermédiaire à clic requis (voir app/auth/confirm) : évite que
      // le pré-chargement des liens par certains clients mail (Apple Mail/
      // Safari Link Tracking Protection) ne consomme le lien à usage unique
      // avant le vrai clic de l'utilisateur.
      emailRedirectTo: `${origin}/auth/confirm?next=/${locale}/dashboard`,
      data: {
        first_name: firstName,
        last_name: lastName,
        city,
        profession,
        address,
        phone,
        // Langue préférée : utilisée pour les notifications déclenchées
        // par l'admin (rendues dans la langue du client).
        locale,
      },
    },
  });

  if (error) return { error: traduireErreur(error.message, E) };
  const userId = data.user?.id;

  // Upload de la pièce d'identité + du selfie dans le bucket privé "documents".
  // Les deux enregistrements sont INDÉPENDANTS : si la colonne selfie_path
  // n'existe pas encore (migration non appliquée), l'enregistrement de la
  // pièce d'identité (flux existant) reste intact.
  if (userId) {
    const admin = createAdminClient();

    const docExt = doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg";
    const docPath = `${userId}/piece-identite.${docExt}`;
    const { error: docErr } = await admin.storage
      .from("documents")
      .upload(docPath, new Uint8Array(await doc.arrayBuffer()), {
        contentType: doc.type,
        upsert: true,
      });
    if (!docErr) {
      await admin.from("profiles").update({ id_document_path: docPath }).eq("id", userId);
    }

    const selfieExt = selfie.type === "image/png" ? "png" : "jpg";
    const selfiePath = `${userId}/selfie.${selfieExt}`;
    const { error: selfieErr } = await admin.storage
      .from("documents")
      .upload(selfiePath, new Uint8Array(await selfie.arrayBuffer()), {
        contentType: selfie.type,
        upsert: true,
      });
    if (!selfieErr) {
      // Échoue silencieusement si la colonne n'existe pas encore.
      await admin.from("profiles").update({ selfie_path: selfiePath }).eq("id", userId);
    }
  }

  // Email de confirmation activé côté Supabase → pas de session immédiate.
  // Redirection vers une page dédiée plutôt qu'un message sur le formulaire
  // (qui resterait affiché, rempli, sous la confirmation).
  if (!data.session) {
    return localizedRedirect("/compte-cree");
  }

  return localizedRedirect("/dashboard");
}

/** Connexion client. */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  const E = await authErrors();
  if (!email || !password) return { error: E.credentialsRequired };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduireErreur(error.message, E) };

  // Rafraîchit la langue préférée (best-effort) : la langue de navigation
  // actuelle devient celle des futurs emails envoyés par l'admin.
  const locale = await getRequestLocale();
  await supabase.auth.updateUser({ data: { locale } }).catch(() => {});

  // `next` est déjà préfixé de la langue (posé par le proxy) ; validé pour
  // empêcher toute redirection ouverte (`//evil.com`), repli sur le dashboard.
  redirect(safeNextPath(nextRaw, `/${locale}/dashboard`));
}

/** Connexion admin : vérifie le rôle après authentification. */
export async function signInAdmin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const E = await authErrors();
  if (!email || !password) return { error: E.credentialsRequired };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: traduireErreur(error.message, E) };

  // Vérifie le rôle via la clé service (contourne la RLS de façon fiable).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: E.notAdmin };
  }

  return localizedRedirect("/admin");
}

/** Demande de réinitialisation : envoie le lien par email (flux conventionnel). */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const E = await authErrors();
  if (!email) return { error: E.emailRequiredShort };

  const origin = await getOrigin();
  const locale = await getRequestLocale();
  const supabase = await createClient();
  // Page intermédiaire à clic requis (voir app/auth/confirm), pour la même
  // raison que pour la confirmation d'inscription (pré-chargement des liens).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/${locale}/reinitialiser-mot-de-passe`,
  });

  // Réponse volontairement générique (ne révèle pas si le compte existe).
  return { info: E.resetEmailSent };
}

/** Définit le nouveau mot de passe (session de récupération active requise). */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const E = await authErrors();
  if (!isPasswordValid(password)) return { error: E.passwordCriteria };
  if (password !== confirm) return { error: E.passwordsMismatch };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: E.resetLinkInvalid };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduireErreur(error.message, E) };

  return localizedRedirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // localizedRedirect("") → /{locale} (accueil localisé).
  await localizedRedirect("");
}

function traduireErreur(msg: string, E: Dictionary["errors"]["auth"]): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return E.supabase.invalidLogin;
  if (m.includes("already registered") || m.includes("already been registered"))
    return E.supabase.alreadyRegistered;
  if (m.includes("email not confirmed")) return E.supabase.emailNotConfirmed;
  if (m.includes("rate limit")) return E.supabase.rateLimit;
  return E.supabase.generic;
}

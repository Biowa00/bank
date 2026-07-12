"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPasswordValid } from "@/lib/password";

export type AuthState = {
  error?: string;
  info?: string;
};

/** Reconstruit l'origine (protocole + hôte) de la requête courante. */
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 Mo

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

  // Champs requis
  if (!lastName) return { error: "Le nom de famille est requis." };
  if (!firstName) return { error: "Le nom (prénom) est requis." };
  if (!city) return { error: "La ville est requise." };
  if (!profession) return { error: "La profession est requise." };
  if (!address) return { error: "L'adresse complète est requise." };
  if (!phoneNumber) return { error: "Le numéro de téléphone est requis." };
  if (!email) return { error: "L'adresse e-mail est requise." };

  // Mot de passe : 8 caractères min, 1 majuscule, 1 chiffre
  if (password.length < 8)
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!/[A-Z]/.test(password))
    return { error: "Le mot de passe doit contenir au moins une majuscule." };
  if (!/[0-9]/.test(password))
    return { error: "Le mot de passe doit contenir au moins un chiffre." };
  if (password !== confirm)
    return { error: "Les mots de passe ne correspondent pas." };

  if (!cgu)
    return {
      error:
        "Vous devez accepter les conditions générales et la politique de confidentialité.",
    };

  // Pièce d'identité
  if (!(doc instanceof File) || doc.size === 0)
    return { error: "La pièce d'identité (photo) est requise." };
  if (!ALLOWED_DOC_TYPES.includes(doc.type))
    return { error: "Format de pièce d'identité invalide (JPG, PNG ou PDF)." };
  if (doc.size > MAX_DOC_SIZE)
    return { error: "La pièce d'identité dépasse 5 Mo." };

  const phone = dialCode ? `${dialCode} ${phoneNumber}` : phoneNumber;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        city,
        profession,
        address,
        phone,
      },
    },
  });

  if (error) return { error: traduireErreur(error.message) };
  const userId = data.user?.id;

  // Upload de la pièce d'identité dans le bucket privé "documents".
  if (userId) {
    const admin = createAdminClient();
    const ext = doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg";
    const bytes = new Uint8Array(await doc.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(`${userId}/piece-identite.${ext}`, bytes, {
        contentType: doc.type,
        upsert: true,
      });
    if (!upErr) {
      await admin
        .from("profiles")
        .update({ id_document_path: `${userId}/piece-identite.${ext}` })
        .eq("id", userId);
    }
  }

  // Email de confirmation activé côté Supabase → pas de session immédiate.
  if (!data.session) {
    return {
      info: "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.",
    };
  }

  redirect("/dashboard");
}

/** Connexion client. */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password)
    return { error: "E-mail et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduireErreur(error.message) };

  redirect(next.startsWith("/") ? next : "/dashboard");
}

/** Connexion admin : vérifie le rôle après authentification. */
export async function signInAdmin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password)
    return { error: "E-mail et mot de passe requis." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: traduireErreur(error.message) };

  // Vérifie le rôle via la clé service (contourne la RLS de façon fiable).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas les droits administrateur." };
  }

  redirect("/admin");
}

/** Demande de réinitialisation : envoie le lien par email (flux conventionnel). */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Adresse e-mail requise." };

  const origin = await getOrigin();
  const supabase = await createClient();
  // redirectTo pointe vers notre route d'échange, qui ouvre la session de
  // récupération puis renvoie vers la page de nouveau mot de passe.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
  });

  // Réponse volontairement générique (ne révèle pas si le compte existe).
  return {
    info: "Si un compte est associé à cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.",
  };
}

/** Définit le nouveau mot de passe (session de récupération active requise). */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!isPasswordValid(password))
    return { error: "Le mot de passe ne respecte pas les critères de sécurité." };
  if (password !== confirm)
    return { error: "Les mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error:
        "Lien invalide ou expiré. Refaites une demande de réinitialisation.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduireErreur(error.message) };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

function traduireErreur(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("email not confirmed"))
    return "E-mail non confirmé. Vérifie ta boîte mail.";
  if (m.includes("rate limit"))
    return "Trop de tentatives. Réessaie dans un instant.";
  return msg;
}

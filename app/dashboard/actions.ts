"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { canDeposit, canTransfer, canWithdraw } from "@/lib/permissions";
import { cleanIban, isPlausibleIban, formatEuro } from "@/lib/format";

export type ActionState = { error?: string; success?: string };

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/* ============================ DÉPÔT ============================ */
export async function deposit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await getVerifiedProfile();

  const perm = canDeposit(profile);
  if (!perm.allowed) return { error: perm.reason };

  const amount = parseAmount(formData.get("amount"));
  if (amount === null) return { error: "Montant invalide." };
  if (amount > 1_000_000) return { error: "Montant maximum : 1 000 000 €." };

  const admin = createAdminClient();
  const newBalance = Number(profile.balance) + amount;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (upErr) return { error: "Échec du dépôt. Réessaie." };

  await admin.from("transactions").insert({
    user_id: userId,
    type: "deposit",
    direction: "in",
    amount,
    status: "success",
    description: "Dépôt",
  });

  await notify(userId, "Dépôt reçu", `${formatEuro(amount)} ont été crédités sur votre compte.`);

  revalidatePath("/dashboard", "layout");
  return { success: `Dépôt de ${formatEuro(amount)} effectué.` };
}

/* ============================ VIREMENT ============================ */
export async function transfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await getVerifiedProfile();

  const perm = canTransfer(profile);
  const amount = parseAmount(formData.get("amount"));
  const iban = cleanIban(String(formData.get("iban") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;

  if (amount === null) return { error: "Montant invalide." };
  if (!isPlausibleIban(iban))
    return { error: "IBAN destinataire invalide." };
  if (iban === profile.iban)
    return { error: "Impossible de virer vers votre propre compte." };

  const admin = createAdminClient();

  // Virements bloqués → on trace une transaction bloquée pour l'historique.
  if (!perm.allowed) {
    await admin.from("transactions").insert({
      user_id: userId,
      type: "transfer",
      direction: "out",
      amount,
      status: "blocked",
      counterparty_iban: iban,
      description: description ?? "Virement refusé",
    });
    await notify(userId, "Virement refusé", perm.reason ?? "Virements indisponibles.");
    revalidatePath("/dashboard", "layout");
    return { error: perm.reason };
  }

  if (amount > Number(profile.balance))
    return { error: "Solde insuffisant pour ce virement." };

  // Bénéficiaire interne éventuel (pour l'affichage ; le crédit n'a lieu qu'à
  // la validation par l'administrateur).
  const { data: recipient } = await admin
    .from("profiles")
    .select("full_name")
    .eq("iban", iban)
    .maybeSingle<{ full_name: string | null }>();

  // Les fonds sont RÉSERVÉS immédiatement (débit) puis le virement reste
  // « en attente » jusqu'à la décision de l'administrateur. En cas de refus,
  // les fonds sont recrédités.
  const senderBalance = Number(profile.balance) - amount;
  const { error: upErr } = await admin
    .from("profiles")
    .update({ balance: senderBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (upErr) return { error: "Échec du virement. Réessaie." };

  await admin.from("transactions").insert({
    user_id: userId,
    type: "transfer",
    direction: "out",
    amount,
    status: "pending",
    counterparty_iban: iban,
    counterparty_name: recipient?.full_name ?? null,
    description,
  });
  await notify(
    userId,
    "Virement en attente de validation",
    `Votre virement de ${formatEuro(amount)} vers ${iban} a été soumis. Les fonds sont réservés en attendant la validation par un conseiller.`,
  );

  revalidatePath("/dashboard", "layout");
  return {
    success: `Virement de ${formatEuro(amount)} soumis — en attente de validation.`,
  };
}

/* ==================== IBAN DE RETRAIT ==================== */
export async function addWithdrawalAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await getVerifiedProfile();
  const iban = cleanIban(String(formData.get("iban") ?? ""));
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!isPlausibleIban(iban)) return { error: "IBAN invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("withdrawal_accounts")
    .insert({ user_id: userId, iban, label });
  if (error) return { error: "Impossible d'enregistrer cet IBAN." };

  revalidatePath("/dashboard/retrait");
  return { success: "IBAN de retrait enregistré." };
}

export async function deleteWithdrawalAccount(formData: FormData) {
  const { userId } = await getVerifiedProfile();
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  await admin
    .from("withdrawal_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard/retrait");
}

/* ============================ RETRAIT ============================ */
export async function withdraw(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await getVerifiedProfile();

  const amount = parseAmount(formData.get("amount"));
  const accountId = String(formData.get("account_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (amount === null) return { error: "Montant invalide." };
  if (!accountId) return { error: "Choisissez un IBAN de destination." };
  if (!code) return { error: "Le code de retrait est requis." };

  const admin = createAdminClient();

  // IBAN de destination appartenant à l'utilisateur
  const { data: account } = await admin
    .from("withdrawal_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "IBAN de destination introuvable." };

  const perm = canWithdraw(profile);
  if (!perm.allowed) {
    await admin.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      direction: "out",
      amount,
      status: "blocked",
      counterparty_iban: account.iban,
      description: "Retrait refusé",
    });
    await notify(userId, "Retrait refusé", perm.reason ?? "Retraits indisponibles.");
    revalidatePath("/dashboard", "layout");
    return { error: perm.reason };
  }

  if (amount > Number(profile.balance))
    return { error: "Solde insuffisant pour ce retrait." };

  // Validation du code : actif, et générique OU ciblé sur cet utilisateur.
  const { data: codeRow } = await admin
    .from("withdrawal_codes")
    .select("*")
    .eq("code", code)
    .eq("status", "active")
    .eq("percentage_value", 0) // les codes de jauge (>0) ne valident pas un retrait
    .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
    .maybeSingle();

  if (!codeRow) {
    await admin.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      direction: "out",
      amount,
      status: "blocked",
      counterparty_iban: account.iban,
      description: "Code de retrait invalide",
    });
    await notify(
      userId,
      "Retrait refusé",
      "Le code de retrait fourni est invalide, expiré ou déjà utilisé.",
    );
    revalidatePath("/dashboard", "layout");
    return { error: "Code de retrait invalide, expiré ou déjà utilisé." };
  }

  // Consomme le code (usage unique)
  await admin
    .from("withdrawal_codes")
    .update({
      status: "used",
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", codeRow.id);

  const newBalance = Number(profile.balance) - amount;
  await admin
    .from("profiles")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);

  await admin.from("transactions").insert({
    user_id: userId,
    type: "withdrawal",
    direction: "out",
    amount,
    status: "success",
    counterparty_iban: account.iban,
    description: "Retrait",
  });
  await notify(
    userId,
    "Retrait effectué",
    `${formatEuro(amount)} retirés vers ${account.iban}.`,
  );

  revalidatePath("/dashboard", "layout");
  return { success: `Retrait de ${formatEuro(amount)} effectué.` };
}

/* ==================== CARTE ==================== */
export async function toggleCardFrozen(formData: FormData) {
  const { userId, profile } = await getVerifiedProfile();
  const next = !profile.card_frozen;
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ card_frozen: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
  await notify(
    userId,
    next ? "Carte gelée" : "Carte réactivée",
    next
      ? "Votre carte a été gelée. Les opérations sont temporairement bloquées."
      : "Votre carte a été réactivée. Vous pouvez de nouveau effectuer des opérations.",
  );
  revalidatePath("/dashboard", "layout");
}

/* ============ JAUGE DE RETRAIT — VALIDATION D'UN CODE ============ */
export type RedeemState = { error?: string; success?: string; progress?: number };

/**
 * L'utilisateur soumet un code d'incrémentation.
 *  1. Le code existe pour lui (ciblé ou générique), actif, non utilisé, %>0.
 *  2. Nouvelle progression = actuelle + percentage_value (plafonnée à 100).
 *  3. Met à jour withdrawal_progress + passe le code à 'used'.
 *  4. Renvoie la nouvelle progression pour animer la jauge.
 */
export async function redeemWithdrawalCode(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const { userId, profile } = await getVerifiedProfile();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Saisissez un code.", progress: profile.withdrawal_progress };

  const admin = createAdminClient();

  const { data: codeRow } = await admin
    .from("withdrawal_codes")
    .select("*")
    .eq("code", code)
    .eq("status", "active")
    .gt("percentage_value", 0)
    .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
    .maybeSingle();

  if (!codeRow)
    return {
      error: "Code invalide, expiré ou déjà utilisé.",
      progress: profile.withdrawal_progress,
    };

  const newProgress = Math.min(
    100,
    Number(profile.withdrawal_progress) + Number(codeRow.percentage_value),
  );

  const { error: upErr } = await admin
    .from("profiles")
    .update({ withdrawal_progress: newProgress, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (upErr)
    return { error: "Échec de la mise à jour.", progress: profile.withdrawal_progress };

  await admin
    .from("withdrawal_codes")
    .update({ status: "used", used_by: userId, used_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  await notify(
    userId,
    "Progression de retrait mise à jour",
    `Votre jauge de retrait a progressé de +${codeRow.percentage_value}% (désormais ${newProgress}%).`,
  );

  revalidatePath("/dashboard", "layout");
  return {
    success: `+${codeRow.percentage_value}% appliqués. Progression : ${newProgress}%.`,
    progress: newProgress,
  };
}

/* ==================== NOTIFICATIONS ==================== */
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  revalidatePath("/dashboard", "layout");
}

/* ==================== PROFIL ==================== */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await getVerifiedProfile();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Le nom ne peut pas être vide." };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", userId);

  revalidatePath("/dashboard", "layout");
  return { success: "Profil mis à jour." };
}

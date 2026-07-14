"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { canDeposit, canTransfer, canWithdraw } from "@/lib/permissions";
import { cleanIban, isPlausibleIban, formatEuro } from "@/lib/format";
import { PHASE_MAX_ATTEMPTS, PHASE_TOTAL } from "@/lib/transferPhases";

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

/* ============ CONFIRMATION D'UNE PHASE DE VIREMENT ============ */
export type PhaseState = { error?: string; success?: string; phase?: number };

/**
 * Le client saisit le code reçu pour la phase en cours de son virement.
 * Code correct → phase confirmée ; à la 3ᵉ phase, le virement est exécuté.
 * Code incorrect → tentative décomptée ; au-delà du maximum, le code expire.
 */
export async function confirmTransferPhase(
  _prev: PhaseState,
  formData: FormData,
): Promise<PhaseState> {
  const { userId } = await getVerifiedProfile();
  const txId = String(formData.get("transaction_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!txId || !code) return { error: "Code requis." };

  const admin = createAdminClient();

  const { data: tx } = await admin
    .from("transactions")
    .select("id, user_id, amount, status, type, counterparty_iban, unlock_phase")
    .eq("id", txId)
    .eq("user_id", userId)
    .eq("type", "transfer")
    .eq("status", "pending")
    .maybeSingle<{
      id: string;
      user_id: string;
      amount: number;
      status: string;
      type: string;
      counterparty_iban: string | null;
      unlock_phase: number;
    }>();
  if (!tx) return { error: "Virement introuvable ou déjà traité." };

  const currentPhase = tx.unlock_phase + 1;
  if (currentPhase > PHASE_TOTAL)
    return { error: "Toutes les phases sont déjà confirmées.", phase: tx.unlock_phase };

  const { data: row } = await admin
    .from("transfer_phase_codes")
    .select("*")
    .eq("transaction_id", tx.id)
    .eq("phase", currentPhase)
    .eq("status", "code_envoye")
    .order("created_at", { ascending: false })
    .maybeSingle<{ id: string; code: string; attempts: number; expires_at: string }>();

  if (!row)
    return {
      error: "Aucun code en attente pour ce virement. Contactez votre conseiller.",
      phase: tx.unlock_phase,
    };

  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now) {
    await admin.from("transfer_phase_codes").update({ status: "expire" }).eq("id", row.id);
    return { error: "Ce code a expiré. Un nouveau code doit être généré par votre conseiller.", phase: tx.unlock_phase };
  }
  if (row.attempts >= PHASE_MAX_ATTEMPTS) {
    await admin.from("transfer_phase_codes").update({ status: "expire" }).eq("id", row.id);
    return { error: "Trop de tentatives. Un nouveau code doit être généré.", phase: tx.unlock_phase };
  }

  // Code incorrect → on décompte la tentative.
  if (code !== row.code) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= PHASE_MAX_ATTEMPTS;
    await admin
      .from("transfer_phase_codes")
      .update({ attempts, status: exhausted ? "expire" : "code_envoye" })
      .eq("id", row.id);
    return {
      error: exhausted
        ? "Code incorrect. Trop de tentatives : un nouveau code doit être généré."
        : `Code incorrect. ${PHASE_MAX_ATTEMPTS - attempts} tentative(s) restante(s).`,
      phase: tx.unlock_phase,
    };
  }

  // Code correct → phase confirmée.
  const nowIso = new Date().toISOString();
  await admin
    .from("transfer_phase_codes")
    .update({ status: "valide", confirmed_at: nowIso })
    .eq("id", row.id);
  await admin
    .from("transactions")
    .update({ unlock_phase: currentPhase, updated_at: nowIso })
    .eq("id", tx.id);

  // Journalise la confirmation client (traçabilité).
  await admin.from("admin_audit_log").insert({
    admin_id: null,
    admin_email: null,
    action: `transfer.phase${currentPhase}.confirm`,
    target_user_id: userId,
    reason: null,
    details: { tx_id: tx.id, phase: currentPhase },
  });

  const amount = Number(tx.amount);

  // 3ᵉ phase confirmée → exécution effective du virement.
  if (currentPhase === PHASE_TOTAL) {
    if (tx.counterparty_iban) {
      const { data: recipient } = await admin
        .from("profiles")
        .select("id, full_name, balance, status")
        .eq("iban", tx.counterparty_iban)
        .maybeSingle<{ id: string; full_name: string | null; balance: number; status: string }>();
      if (recipient && recipient.status !== "banned") {
        const { data: sender } = await admin
          .from("profiles")
          .select("full_name, iban")
          .eq("id", tx.user_id)
          .maybeSingle<{ full_name: string | null; iban: string }>();
        await admin
          .from("profiles")
          .update({ balance: Number(recipient.balance) + amount, updated_at: nowIso })
          .eq("id", recipient.id);
        await admin.from("transactions").insert({
          user_id: recipient.id,
          type: "transfer",
          direction: "in",
          amount,
          status: "success",
          counterparty_iban: sender?.iban ?? null,
          counterparty_name: sender?.full_name ?? null,
          description: "Virement reçu",
        });
        await notify(
          recipient.id,
          "Virement reçu",
          `Vous avez reçu ${formatEuro(amount)}${sender?.full_name ? ` de ${sender.full_name}` : ""}.`,
        );
      }
    }

    await admin
      .from("transactions")
      .update({ status: "success", reviewed_at: nowIso })
      .eq("id", tx.id);

    await notify(
      userId,
      "Virement débloqué et exécuté",
      `Les 3 phases ont été confirmées. Votre virement de ${formatEuro(amount)} a été exécuté.`,
    );
  } else {
    await notify(
      userId,
      `Phase ${currentPhase}/${PHASE_TOTAL} confirmée`,
      `La phase ${currentPhase} de votre virement de ${formatEuro(amount)} est confirmée. En attente de la phase suivante.`,
      { email: false },
    );
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin/virements");
  return {
    success:
      currentPhase === PHASE_TOTAL
        ? "Virement débloqué et exécuté."
        : `Phase ${currentPhase} confirmée.`,
    phase: currentPhase,
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

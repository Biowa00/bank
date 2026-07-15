"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { formatEuro } from "@/lib/format";
import {
  generatePhaseCode,
  phaseName,
  PHASE_CODE_TTL_MIN,
  PHASE_TOTAL,
} from "@/lib/transferPhases";
import type { AccountStatus } from "@/lib/types";

export type AdminState = { error?: string; success?: string; code?: string };

/** Journalise une action admin (table non modifiable). */
async function logAudit(
  adminId: string,
  adminEmail: string,
  action: string,
  targetUserId: string | null,
  reason: string | null,
  details: Record<string, unknown> = {},
) {
  const admin = createAdminClient();
  await admin.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action,
    target_user_id: targetUserId,
    reason,
    details,
  });
}

/* ==================== STATUT DE COMPTE ==================== */
export async function setAccountStatus(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "") as AccountStatus;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!targetId || !["active", "restricted", "banned"].includes(status))
    return { error: "Requête invalide." };
  if (status !== "active" && !reason)
    return { error: "Un motif est obligatoire pour restreindre ou bannir." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      status,
      status_reason: status === "active" ? null : reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);
  if (error) return { error: "Échec de la mise à jour du statut." };

  const labels: Record<AccountStatus, string> = {
    active: "réactivé",
    restricted: "restreint",
    banned: "banni",
  };
  await notify(
    targetId,
    `Compte ${labels[status]}`,
    status === "active"
      ? "Votre compte a été réactivé. Vous avez de nouveau accès à tous les services."
      : `Votre compte a été ${labels[status]}. Motif : ${reason}`,
  );
  await logAudit(adminId, email, `account.${status}`, targetId, reason || null);

  revalidatePath("/[lang]/admin/users/[id]", "page");
  revalidatePath("/[lang]/admin/users", "page");
  return { success: `Compte ${labels[status]}.` };
}

/* ==================== BLOCAGES CIBLÉS ==================== */
export async function setBlock(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  const kind = String(formData.get("kind") ?? ""); // 'withdrawals' | 'transfers'
  const blocked = String(formData.get("blocked") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!targetId || !["withdrawals", "transfers"].includes(kind))
    return { error: "Requête invalide." };
  if (blocked && !reason)
    return { error: "Un motif est obligatoire pour bloquer." };

  const admin = createAdminClient();
  const patch =
    kind === "withdrawals"
      ? {
          withdrawals_blocked: blocked,
          withdrawals_block_reason: blocked ? reason : null,
        }
      : {
          transfers_blocked: blocked,
          transfers_block_reason: blocked ? reason : null,
        };

  const { error } = await admin
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", targetId);
  if (error) return { error: "Échec du blocage." };

  const label = kind === "withdrawals" ? "retraits" : "virements";
  await notify(
    targetId,
    blocked ? `${label[0].toUpperCase()}${label.slice(1)} bloqués` : `${label[0].toUpperCase()}${label.slice(1)} débloqués`,
    blocked
      ? `Vos ${label} ont été bloqués. Motif : ${reason}`
      : `Vos ${label} ont été débloqués.`,
  );
  await logAudit(
    adminId,
    email,
    `${kind}.${blocked ? "block" : "unblock"}`,
    targetId,
    reason || null,
  );

  revalidatePath("/[lang]/admin/users/[id]", "page");
  return {
    success: blocked ? `${label} bloqués.` : `${label} débloqués.`,
  };
}

/* ============ COMMUTATEURS DE RESTRICTION (Module 1) ============ */
type RestrictionKind = "ban" | "deposit" | "withdrawal" | "transfer";

/**
 * Bascule rapide d'une restriction. `value` est l'état CIBLÉ (true = activé).
 *  - ban        : true => status 'banned', false => 'active'
 *  - deposit    : autorise (true) / retire (false) les dépôts
 *  - withdrawal : bloque (true) / débloque (false) les retraits
 *  - transfer   : bloque (true) / débloque (false) les virements
 */
export async function setRestriction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  const kind = String(formData.get("kind") ?? "") as RestrictionKind;
  const value = String(formData.get("value") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!targetId || !["ban", "deposit", "withdrawal", "transfer"].includes(kind))
    return { error: "Requête invalide." };

  const now = new Date().toISOString();
  const admin = createAdminClient();

  let patch: Record<string, unknown>;
  let title: string;
  let body: string;
  let action: string;

  switch (kind) {
    case "ban":
      patch = {
        status: value ? "banned" : "active",
        status_reason: value ? (reason ?? "Compte banni par l'administration.") : null,
      };
      title = value ? "Compte banni" : "Compte réactivé";
      body = value
        ? `Votre compte a été banni.${reason ? ` Motif : ${reason}` : ""}`
        : "Votre compte a été réactivé.";
      action = value ? "account.banned" : "account.active";
      break;
    case "deposit":
      patch = { deposit_authorized: value };
      title = value ? "Dépôts autorisés" : "Dépôts suspendus";
      body = value
        ? "Vos dépôts sont désormais autorisés."
        : "Vos dépôts ont été suspendus.";
      action = value ? "deposit.authorize" : "deposit.suspend";
      break;
    case "withdrawal":
      patch = {
        withdrawals_blocked: value,
        withdrawals_block_reason: value ? (reason ?? "Retraits bloqués.") : null,
      };
      title = value ? "Retraits bloqués" : "Retraits débloqués";
      body = value
        ? `Vos retraits ont été bloqués.${reason ? ` Motif : ${reason}` : ""}`
        : "Vos retraits ont été débloqués.";
      action = value ? "withdrawals.block" : "withdrawals.unblock";
      break;
    default: // transfer
      patch = {
        transfers_blocked: value,
        transfers_block_reason: value ? (reason ?? "Virements bloqués.") : null,
      };
      title = value ? "Virements bloqués" : "Virements débloqués";
      body = value
        ? `Vos virements ont été bloqués.${reason ? ` Motif : ${reason}` : ""}`
        : "Vos virements ont été débloqués.";
      action = value ? "transfers.block" : "transfers.unblock";
  }

  const { error } = await admin
    .from("profiles")
    .update({ ...patch, updated_at: now })
    .eq("id", targetId);
  if (error) return { error: "Échec de la mise à jour." };

  await notify(targetId, title, body);
  await logAudit(adminId, email, action, targetId, reason);

  revalidatePath("/[lang]/admin/users/[id]", "page");
  revalidatePath("/[lang]/admin/users", "page");
  return { success: title };
}

/* ============ CRÉDITER / AJUSTER LE COMPTE (Module 2) ============ */
export async function adminCredit(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const raw = Number(String(formData.get("amount") ?? "").replace(",", "."));

  if (!targetId) return { error: "Utilisateur invalide." };
  if (!Number.isFinite(raw) || raw === 0)
    return { error: "Montant invalide (positif pour créditer, négatif pour débiter)." };
  if (Math.abs(raw) > 1_000_000)
    return { error: "Montant maximum : 1 000 000 €." };
  if (!reason) return { error: "Un motif est obligatoire." };

  const amount = Math.round(raw * 100) / 100;
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", targetId)
    .maybeSingle<{ balance: number }>();
  if (!target) return { error: "Utilisateur introuvable." };

  const newBalance = Math.round((Number(target.balance) + amount) * 100) / 100;
  if (newBalance < 0)
    return { error: "Le solde ne peut pas devenir négatif." };

  const { error: upErr } = await admin
    .from("profiles")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", targetId);
  if (upErr) return { error: "Échec de la mise à jour du solde." };

  await admin.from("transactions").insert({
    user_id: targetId,
    type: "admin_credit",
    direction: amount >= 0 ? "in" : "out",
    amount: Math.abs(amount),
    status: "success",
    description: reason,
  });

  await notify(
    targetId,
    amount >= 0 ? "Compte crédité" : "Ajustement de compte",
    `${amount >= 0 ? "+" : "−"}${formatEuro(Math.abs(amount))} — ${reason}`,
  );
  await logAudit(adminId, email, "account.credit", targetId, reason, { amount });

  revalidatePath("/[lang]/admin/users/[id]", "page");
  revalidatePath("/[lang]/admin/users", "page");
  return {
    success: `${amount >= 0 ? "Crédit" : "Débit"} de ${formatEuro(Math.abs(amount))} appliqué.`,
  };
}

/* ============ VALIDATION DES VIREMENTS (Module virement) ============ */
type TransferRow = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  type: string;
  counterparty_iban: string | null;
  unlock_phase: number;
};

async function loadPendingTransfer(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("transactions")
    .select("id, user_id, amount, status, type, counterparty_iban, unlock_phase")
    .eq("id", id)
    .maybeSingle<TransferRow>();
  return data;
}

/**
 * L'administrateur VALIDE une phase (1, 2 ou 3) d'un virement en attente.
 * Chaque validation génère un code unique (6 chiffres, à usage unique, expirant)
 * envoyé au client (email + notification). Les phases sont séquentielles :
 * une phase n'est validable que si la précédente a été confirmée par le client.
 * Le virement n'est exécuté qu'après confirmation de la 3ᵉ phase (côté client).
 */
export async function startTransferPhase(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const id = String(formData.get("tx_id") ?? "");
  const phase = Number(formData.get("phase") ?? 0);

  const tx = await loadPendingTransfer(id);
  if (!tx || tx.type !== "transfer" || tx.status !== "pending")
    return { error: "Virement introuvable ou déjà traité." };
  if (![1, 2, 3].includes(phase)) return { error: "Phase invalide." };
  if (phase !== tx.unlock_phase + 1)
    return {
      error:
        phase <= tx.unlock_phase
          ? "Cette phase est déjà confirmée."
          : "La phase précédente doit d'abord être confirmée par le client.",
    };

  const admin = createAdminClient();
  const now = new Date();
  const code = generatePhaseCode();
  const expiresAt = new Date(now.getTime() + PHASE_CODE_TTL_MIN * 60_000).toISOString();

  // Invalide un éventuel code encore actif pour cette phase (régénération).
  await admin
    .from("transfer_phase_codes")
    .update({ status: "expire" })
    .eq("transaction_id", tx.id)
    .eq("phase", phase)
    .eq("status", "code_envoye");

  const { error: insErr } = await admin.from("transfer_phase_codes").insert({
    transaction_id: tx.id,
    phase,
    code,
    status: "code_envoye",
    expires_at: expiresAt,
    created_by: adminId,
  });
  if (insErr) return { error: "Échec de la génération du code." };

  const name = phaseName(phase);
  await notify(
    tx.user_id,
    `${name} — ${code}`,
    `Phase ${phase}/${PHASE_TOTAL} de votre virement de ${formatEuro(Number(tx.amount))} : votre ${name.toLowerCase()} est ${code}. Saisissez-le dans votre espace pour confirmer. Code valable ${PHASE_CODE_TTL_MIN} minutes.`,
  );
  await logAudit(adminId, email, `transfer.phase${phase}.send`, tx.user_id, null, {
    tx_id: tx.id,
    phase,
  });

  revalidatePath("/[lang]/admin/virements", "page");
  revalidatePath("/[lang]/admin", "page");
  return { success: `Phase ${phase} validée — code envoyé au client.` };
}

/** L'administrateur REFUSE un virement en attente : les fonds réservés sont
 *  recrédités à l'émetteur, un motif obligatoire lui est notifié. */
export async function rejectTransfer(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const id = String(formData.get("tx_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Un motif de refus est obligatoire." };

  const tx = await loadPendingTransfer(id);
  if (!tx || tx.type !== "transfer" || tx.status !== "pending")
    return { error: "Virement introuvable ou déjà traité." };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const amount = Number(tx.amount);

  // Recrédite l'émetteur (les fonds avaient été réservés à l'émission).
  const { data: sender } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", tx.user_id)
    .maybeSingle<{ balance: number }>();
  if (sender) {
    await admin
      .from("profiles")
      .update({ balance: Number(sender.balance) + amount, updated_at: now })
      .eq("id", tx.user_id);
  }

  await admin
    .from("transactions")
    .update({
      status: "rejected",
      decline_reason: reason,
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq("id", tx.id);

  await notify(
    tx.user_id,
    "Virement refusé",
    `Votre virement de ${formatEuro(amount)} a été refusé. Motif : ${reason}. Les fonds ont été recrédités sur votre compte.`,
  );
  await logAudit(adminId, email, "transfer.reject", tx.user_id, reason, {
    tx_id: tx.id,
    amount,
  });

  revalidatePath("/[lang]/admin/virements", "page");
  revalidatePath("/[lang]/admin", "page");
  return { success: `Virement refusé et remboursé (${formatEuro(amount)}).` };
}

/* ==================== CODES DE RETRAIT ==================== */
export async function createWithdrawalCode(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const target = String(formData.get("target_user_id") ?? "").trim() || null;
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(Number(formData.get("percentage_value") ?? 0))),
  );

  if (!name) return { error: "Le nom du code est requis." };

  // Code fourni par l'admin, ou généré automatiquement (ex : RETR-4821).
  const provided = String(formData.get("code") ?? "").trim();
  const code =
    provided || `RETR-${Math.floor(1000 + Math.random() * 9000)}`;

  const admin = createAdminClient();
  const { error } = await admin.from("withdrawal_codes").insert({
    name,
    code,
    reason,
    percentage_value: percentage,
    target_user_id: target,
    created_by: adminId,
  });
  if (error) return { error: "Échec de la création du code (code déjà existant ?)." };

  await logAudit(adminId, email, "code.create", target, reason, {
    name,
    code,
    percentage,
  });
  revalidatePath("/[lang]/admin/codes", "page");
  if (target) revalidatePath("/[lang]/admin/users/[id]", "page");
  return {
    success: `Code « ${name} » créé${percentage ? ` (+${percentage}%)` : ""}.`,
    code,
  };
}

export async function revokeWithdrawalCode(formData: FormData) {
  const { userId: adminId, email } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  await admin
    .from("withdrawal_codes")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "active");
  await logAudit(adminId, email, "code.revoke", null, null, { code_id: id });
  revalidatePath("/[lang]/admin/codes", "page");
}

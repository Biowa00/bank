"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { formatEuro } from "@/lib/format";
import { localizedRedirect } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/config";
import { generatePhaseCode, PHASE_CODE_TTL_MIN } from "@/lib/transferPhases";
import type { AccountStatus } from "@/lib/types";
import type { Dictionary } from "../dictionaries";

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
  // Notification/email rendus dans la langue du CLIENT (pas celle de l'admin).
  await notifyUser(targetId, (dict) => {
    const A = dict.emails.notify.admin;
    if (status === "active") return A.accountReactivated;
    if (status === "restricted")
      return {
        title: A.accountRestricted.title,
        body: interpolate(A.accountRestricted.body, { reason }),
      };
    return {
      title: A.accountBanned.title,
      body: interpolate(A.accountBanned.bodyReason, { reason }),
    };
  });
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
  await notifyUser(targetId, (dict) => {
    const A = dict.emails.notify.admin;
    if (blocked) {
      const k = kind === "withdrawals" ? A.withdrawalsBlocked : A.transfersBlocked;
      return { title: k.title, body: interpolate(k.bodyReason, { reason }) };
    }
    return kind === "withdrawals" ? A.withdrawalsUnblocked : A.transfersUnblocked;
  });
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
  let action: string;

  switch (kind) {
    case "ban":
      patch = {
        status: value ? "banned" : "active",
        status_reason: value ? (reason ?? "Compte banni par l'administration.") : null,
      };
      title = value ? "Compte banni" : "Compte réactivé";
      action = value ? "account.banned" : "account.active";
      break;
    case "deposit":
      patch = { deposit_authorized: value };
      title = value ? "Dépôts autorisés" : "Dépôts suspendus";
      action = value ? "deposit.authorize" : "deposit.suspend";
      break;
    case "withdrawal":
      patch = {
        withdrawals_blocked: value,
        withdrawals_block_reason: value ? (reason ?? "Retraits bloqués.") : null,
      };
      title = value ? "Retraits bloqués" : "Retraits débloqués";
      action = value ? "withdrawals.block" : "withdrawals.unblock";
      break;
    default: // transfer
      patch = {
        transfers_blocked: value,
        transfers_block_reason: value ? (reason ?? "Virements bloqués.") : null,
      };
      title = value ? "Virements bloqués" : "Virements débloqués";
      action = value ? "transfers.block" : "transfers.unblock";
  }

  const { error } = await admin
    .from("profiles")
    .update({ ...patch, updated_at: now })
    .eq("id", targetId);
  if (error) return { error: "Échec de la mise à jour." };

  // `title`/`body` (français) servent au retour UI admin ; la notification
  // au client est rendue dans SA langue.
  await notifyUser(targetId, (dict) => {
    const A = dict.emails.notify.admin;
    switch (kind) {
      case "ban":
        if (!value) return A.accountReactivated;
        return reason
          ? {
              title: A.accountBanned.title,
              body: interpolate(A.accountBanned.bodyReason, { reason }),
            }
          : A.accountBanned;
      case "deposit":
        return value ? A.depositsAuthorized : A.depositsSuspended;
      case "withdrawal":
        if (!value) return A.withdrawalsUnblocked;
        return reason
          ? {
              title: A.withdrawalsBlocked.title,
              body: interpolate(A.withdrawalsBlocked.bodyReason, { reason }),
            }
          : A.withdrawalsBlocked;
      default: // transfer
        if (!value) return A.transfersUnblocked;
        return reason
          ? {
              title: A.transfersBlocked.title,
              body: interpolate(A.transfersBlocked.bodyReason, { reason }),
            }
          : A.transfersBlocked;
    }
  });
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

  await notifyUser(targetId, (dict, loc) => {
    const k = amount >= 0 ? dict.emails.notify.admin.credited : dict.emails.notify.admin.debited;
    return {
      title: k.title,
      body: interpolate(k.body, { amount: formatEuro(Math.abs(amount), loc), reason }),
    };
  });
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
 * L'admin envoie au client un code de validation avec un MOTIF/INTITULÉ libre.
 * Nombre de codes NON limité : l'admin en envoie autant qu'il veut (chacun
 * confirmé par le client) avant d'exécuter le virement. Un nouveau code ne peut
 * être envoyé que si le précédent a été confirmé (séquentiel). Le code est à
 * usage unique, expirant. Aucun débit ici : l'exécution est déclenchée
 * séparément par `executeTransfer`.
 */
export async function sendTransferCode(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const id = String(formData.get("tx_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Un motif / intitulé du code est requis." };

  const tx = await loadPendingTransfer(id);
  if (!tx || tx.type !== "transfer" || tx.status !== "pending")
    return { error: "Virement introuvable ou déjà traité." };

  const admin = createAdminClient();
  const step = tx.unlock_phase + 1;

  // Un seul code actif à la fois : refuse tant que le précédent n'est pas
  // confirmé (ni expiré).
  const { data: active } = await admin
    .from("transfer_phase_codes")
    .select("expires_at")
    .eq("transaction_id", tx.id)
    .eq("phase", step)
    .eq("status", "code_envoye")
    .maybeSingle<{ expires_at: string }>();
  if (active && new Date(active.expires_at).getTime() > Date.now())
    return { error: "Un code est déjà en attente de confirmation par le client." };

  const code = generatePhaseCode();
  const expiresAt = new Date(Date.now() + PHASE_CODE_TTL_MIN * 60_000).toISOString();

  // Expire un éventuel ancien code de cette étape (régénération).
  await admin
    .from("transfer_phase_codes")
    .update({ status: "expire" })
    .eq("transaction_id", tx.id)
    .eq("phase", step)
    .eq("status", "code_envoye");

  const { data: ins, error: insErr } = await admin
    .from("transfer_phase_codes")
    .insert({
      transaction_id: tx.id,
      phase: step,
      code,
      status: "code_envoye",
      expires_at: expiresAt,
      created_by: adminId,
    })
    .select("id")
    .single<{ id: string }>();
  if (insErr) return { error: "Échec de la génération du code." };

  // Motif : mise à jour best-effort (ignorée si la colonne `label` n'existe
  // pas encore — voir migration 0004).
  if (ins?.id) {
    await admin.from("transfer_phase_codes").update({ label }).eq("id", ins.id).then(undefined, () => {});
  }

  await notifyUser(tx.user_id, (dict, loc) => {
    const k = dict.emails.notify.admin.transferCode;
    const vars = { label, code, amount: formatEuro(Number(tx.amount), loc), ttl: PHASE_CODE_TTL_MIN };
    return { title: interpolate(k.title, vars), body: interpolate(k.body, vars) };
  });
  await logAudit(adminId, email, "transfer.code.send", tx.user_id, label, { tx_id: tx.id, step });

  revalidatePath("/[lang]/admin/virements", "page");
  revalidatePath("/[lang]/admin", "page");
  return { success: `Code « ${label} » envoyé au client.` };
}

/**
 * L'admin EXÉCUTE le virement en attente quand il le décide (peu importe le
 * nombre de codes déjà confirmés). C'est ici — et seulement ici — que le
 * montant quitte le compte de l'émetteur ; le bénéficiaire interne éventuel
 * est crédité. Revérifie le solde à l'instant de l'exécution.
 */
export async function executeTransfer(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const id = String(formData.get("tx_id") ?? "");

  const tx = await loadPendingTransfer(id);
  if (!tx || tx.type !== "transfer" || tx.status !== "pending")
    return { error: "Virement introuvable ou déjà traité." };

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const amount = Number(tx.amount);

  const { data: senderRow } = await admin
    .from("profiles")
    .select("balance")
    .eq("id", tx.user_id)
    .maybeSingle<{ balance: number }>();
  const senderBalance = Number(senderRow?.balance ?? 0);

  if (senderBalance < amount) {
    await admin
      .from("transactions")
      .update({ status: "rejected", decline_reason: "Solde insuffisant au moment de l'exécution.", reviewed_by: adminId, reviewed_at: nowIso })
      .eq("id", tx.id);
    await notifyUser(tx.user_id, (dict, loc) => ({
      title: dict.emails.notify.admin.transferRejected.title,
      body: interpolate(dict.emails.notify.admin.transferRejected.body, { amount: formatEuro(amount, loc), reason: "Solde insuffisant." }),
    }));
    revalidatePath("/[lang]/admin/virements", "page");
    return { error: "Solde insuffisant : virement rejeté." };
  }

  // Débit de l'émetteur.
  await admin
    .from("profiles")
    .update({ balance: senderBalance - amount, updated_at: nowIso })
    .eq("id", tx.user_id);

  // Crédit d'un bénéficiaire interne éventuel (par IBAN, hors comptes admin).
  if (tx.counterparty_iban) {
    const { data: recipient } = await admin
      .from("profiles")
      .select("id, balance, status")
      .eq("iban", tx.counterparty_iban)
      .neq("role", "admin")
      .maybeSingle<{ id: string; balance: number; status: string }>();
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
      await notifyUser(recipient.id, (dict, loc) => {
        const NT = dict.emails.notify;
        const from = sender?.full_name ? interpolate(NT.transferReceived.fromName, { name: sender.full_name }) : "";
        return { title: NT.transferReceived.title, body: interpolate(NT.transferReceived.body, { amount: formatEuro(amount, loc), from }) };
      });
    }
  }

  await admin
    .from("transactions")
    .update({ status: "success", reviewed_by: adminId, reviewed_at: nowIso })
    .eq("id", tx.id);
  await notifyUser(tx.user_id, (dict, loc) => ({
    title: dict.emails.notify.transferExecuted.title,
    body: interpolate(dict.emails.notify.transferExecuted.body, { amount: formatEuro(amount, loc) }),
  }));
  await logAudit(adminId, email, "transfer.execute", tx.user_id, null, { tx_id: tx.id, amount });

  revalidatePath("/[lang]/admin/virements", "page");
  revalidatePath("/[lang]/admin", "page");
  return { success: `Virement de ${formatEuro(amount)} exécuté.` };
}

/** L'administrateur REFUSE un virement en attente. Le montant n'est débité
 *  du compte de l'émetteur qu'à la confirmation de la 3ᵉ phase (voir
 *  confirmTransferPhase) : un refus avant cela ne nécessite donc aucun
 *  recrédit, puisqu'aucun fonds n'a encore quitté le compte. */
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

  await admin
    .from("transactions")
    .update({
      status: "rejected",
      decline_reason: reason,
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq("id", tx.id);

  await notifyUser(tx.user_id, (dict, loc) => ({
    title: dict.emails.notify.admin.transferRejected.title,
    body: interpolate(dict.emails.notify.admin.transferRejected.body, {
      amount: formatEuro(amount, loc),
      reason,
    }),
  }));
  await logAudit(adminId, email, "transfer.reject", tx.user_id, reason, {
    tx_id: tx.id,
    amount,
  });

  revalidatePath("/[lang]/admin/virements", "page");
  revalidatePath("/[lang]/admin", "page");
  return { success: `Virement de ${formatEuro(amount)} refusé.` };
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

  // Notification + email dans la langue du destinataire. Message construit via
  // le dictionnaire de chaque client (nom du code, valeur, motif éventuel).
  const buildMsg = (dict: Dictionary) => {
    const k = dict.emails.notify.admin.withdrawalCode;
    const base = interpolate(k.body, { name, code });
    return {
      title: k.title,
      body: reason ? base + interpolate(k.reasonSuffix, { reason }) : base,
    };
  };

  if (target) {
    // Code ciblé → uniquement ce client.
    await notifyUser(target, buildMsg);
  } else {
    // Code générique (utilisable par n'importe quel compte) → tous les clients.
    const { data: allUsers } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "user")
      .returns<{ id: string }[]>();
    for (const u of allUsers ?? []) {
      await notifyUser(u.id, buildMsg);
    }
  }

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

/* ==================== SUPPRESSION DE PROFIL CLIENT ==================== */
/**
 * Supprime définitivement un compte client : toutes ses données (transactions,
 * notifications, codes, comptes de retrait, documents KYC), son profil et son
 * compte d'authentification. Irréversible. Un admin ne peut pas être supprimé.
 * Confirmation exigée côté formulaire (champ `confirm` = "SUPPRIMER").
 */
export async function deleteUser(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const { userId: adminId, email } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();

  if (!targetId) return { error: "Utilisateur invalide." };
  if (confirm !== "SUPPRIMER")
    return { error: "Saisissez SUPPRIMER pour confirmer la suppression." };

  const admin = createAdminClient();

  // Garde-fou : on ne supprime jamais un compte admin.
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, id_document_path, selfie_path")
    .eq("id", targetId)
    .maybeSingle<{ id: string; role: string; id_document_path: string | null; selfie_path: string | null }>();
  if (!target) return { error: "Utilisateur introuvable." };
  if (target.role === "admin") return { error: "Impossible de supprimer un compte administrateur." };

  // Codes de phase liés aux transactions de l'utilisateur.
  const { data: txs } = await admin
    .from("transactions")
    .select("id")
    .eq("user_id", targetId)
    .returns<{ id: string }[]>();
  const txIds = (txs ?? []).map((t) => t.id);
  if (txIds.length > 0) {
    await admin.from("transfer_phase_codes").delete().in("transaction_id", txIds);
  }

  // Données liées, puis profil.
  await admin.from("notifications").delete().eq("user_id", targetId);
  await admin.from("transactions").delete().eq("user_id", targetId);
  await admin.from("withdrawal_accounts").delete().eq("user_id", targetId);
  await admin.from("withdrawal_codes").delete().eq("target_user_id", targetId);

  // Documents KYC dans le bucket privé (best-effort).
  const paths = [target.id_document_path, target.selfie_path].filter(
    (p): p is string => Boolean(p),
  );
  if (paths.length > 0) {
    await admin.storage.from("documents").remove(paths).then(undefined, () => {});
  }

  await admin.from("profiles").delete().eq("id", targetId);

  // Compte d'authentification (dernier, pour que le trigger ne recrée rien).
  const { error: authErr } = await admin.auth.admin.deleteUser(targetId);
  if (authErr) return { error: "Échec de la suppression du compte d'authentification." };

  await logAudit(adminId, email, "account.delete", targetId, null);
  revalidatePath("/[lang]/admin/users", "page");
  return localizedRedirect("/admin/users");
}

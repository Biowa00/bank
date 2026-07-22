"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { canDeposit, canTransfer, canWithdraw, permissionReason } from "@/lib/permissions";
import { cleanIban, isPlausibleIban, formatEuro } from "@/lib/format";
import { PHASE_MAX_ATTEMPTS, PHASE_TOTAL } from "@/lib/transferPhases";
import { getRequestLocale } from "@/lib/i18n/server";
import { getDictionary } from "../dictionaries";
import { interpolate, type Locale } from "@/lib/i18n/config";

export type ActionState = { error?: string; success?: string };

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Locale + dictionnaire de la requête courante (langue de l'utilisateur actif). */
async function ctx(): Promise<{ locale: Locale; dict: Awaited<ReturnType<typeof getDictionary>> }> {
  const locale = await getRequestLocale();
  return { locale, dict: await getDictionary(locale) };
}

/* ============================ DÉPÔT ============================ */
export async function deposit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, dict } = await ctx();
  const E = dict.errors;
  const { userId, profile } = await getVerifiedProfile();

  const perm = canDeposit(profile);
  if (!perm.allowed)
    return { error: permissionReason(perm, dict.dashboard.permissions) };

  const amount = parseAmount(formData.get("amount"));
  if (amount === null) return { error: E.amount.invalid };
  if (amount > 1_000_000) return { error: E.amount.max };

  const admin = createAdminClient();
  const newBalance = Number(profile.balance) + amount;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (upErr) return { error: E.deposit.failed };

  await admin.from("transactions").insert({
    user_id: userId,
    type: "deposit",
    direction: "in",
    amount,
    status: "success",
    description: "Dépôt",
  });

  const n = dict.emails.notify.depositReceived;
  await notify(userId, n.title, interpolate(n.body, { amount: formatEuro(amount, locale) }));

  revalidatePath("/[lang]/dashboard", "layout");
  return { success: interpolate(E.success.deposit, { amount: formatEuro(amount, locale) }) };
}

/* ============================ VIREMENT ============================ */
export async function transfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, dict } = await ctx();
  const E = dict.errors;
  const { userId, profile } = await getVerifiedProfile();

  const perm = canTransfer(profile);
  const amount = parseAmount(formData.get("amount"));
  const iban = cleanIban(String(formData.get("iban") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;

  if (amount === null) return { error: E.amount.invalid };
  if (!isPlausibleIban(iban)) return { error: E.transfer.ibanInvalid };
  if (iban === profile.iban) return { error: E.transfer.ownAccount };

  const admin = createAdminClient();

  // Virements bloqués → on trace une transaction bloquée pour l'historique.
  if (!perm.allowed) {
    const reason = permissionReason(perm, dict.dashboard.permissions);
    await admin.from("transactions").insert({
      user_id: userId,
      type: "transfer",
      direction: "out",
      amount,
      status: "blocked",
      counterparty_iban: iban,
      description: description ?? "Virement refusé",
    });
    await notify(userId, dict.emails.notify.transferRejected.title, reason);
    revalidatePath("/[lang]/dashboard", "layout");
    return { error: reason };
  }

  if (amount > Number(profile.balance)) return { error: E.transfer.insufficient };

  // Bénéficiaire interne éventuel (pour l'affichage ; le crédit n'a lieu qu'à
  // la validation par l'administrateur). Les comptes admin sont exclus.
  const { data: recipient } = await admin
    .from("profiles")
    .select("full_name")
    .eq("iban", iban)
    .neq("role", "admin")
    .maybeSingle<{ full_name: string | null }>();

  // Le solde n'est PAS débité à la soumission : le virement reste « en
  // attente » et le montant n'est prélevé qu'à la confirmation de la 3ᵉ et
  // dernière phase par le client (voir confirmTransferPhase). Le contrôle de
  // solde suffisant ci-dessus n'est qu'indicatif ; il est revérifié à
  // l'exécution, au cas où le solde aurait changé entre-temps.
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
  const nP = dict.emails.notify.transferPending;
  await notify(
    userId,
    nP.title,
    interpolate(nP.body, { amount: formatEuro(amount, locale), iban }),
  );

  revalidatePath("/[lang]/dashboard", "layout");
  return {
    success: interpolate(E.success.transferSubmitted, { amount: formatEuro(amount, locale) }),
  };
}

/* ==================== IBAN DE RETRAIT ==================== */
export async function addWithdrawalAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { dict } = await ctx();
  const E = dict.errors;
  const { userId } = await getVerifiedProfile();
  const iban = cleanIban(String(formData.get("iban") ?? ""));
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!isPlausibleIban(iban)) return { error: E.withdrawalAccount.ibanInvalid };

  const admin = createAdminClient();
  const { error } = await admin
    .from("withdrawal_accounts")
    .insert({ user_id: userId, iban, label });
  if (error) return { error: E.withdrawalAccount.saveFailed };

  revalidatePath("/[lang]/dashboard/retrait", "page");
  return { success: E.success.ibanSaved };
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
  revalidatePath("/[lang]/dashboard/retrait", "page");
}

/* ============================ RETRAIT ============================ */
export async function withdraw(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, dict } = await ctx();
  const E = dict.errors;
  const { userId, profile } = await getVerifiedProfile();

  const amount = parseAmount(formData.get("amount"));
  const accountId = String(formData.get("account_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (amount === null) return { error: E.amount.invalid };
  if (!accountId) return { error: E.withdraw.chooseIban };
  if (!code) return { error: E.withdraw.codeRequired };

  const admin = createAdminClient();

  // IBAN de destination appartenant à l'utilisateur
  const { data: account } = await admin
    .from("withdrawal_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: E.withdraw.ibanNotFound };

  const perm = canWithdraw(profile);
  if (!perm.allowed) {
    const reason = permissionReason(perm, dict.dashboard.permissions);
    await admin.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      direction: "out",
      amount,
      status: "blocked",
      counterparty_iban: account.iban,
      description: "Retrait refusé",
    });
    await notify(userId, dict.emails.notify.withdrawalRejected.title, reason);
    revalidatePath("/[lang]/dashboard", "layout");
    return { error: reason };
  }

  if (amount > Number(profile.balance)) return { error: E.withdraw.insufficient };

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
      dict.emails.notify.withdrawalRejected.title,
      dict.emails.notify.withdrawalRejected.invalidCode,
    );
    revalidatePath("/[lang]/dashboard", "layout");
    return { error: E.withdraw.codeInvalid };
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
  const nW = dict.emails.notify.withdrawalDone;
  await notify(
    userId,
    nW.title,
    interpolate(nW.body, { amount: formatEuro(amount, locale), iban: account.iban }),
  );

  revalidatePath("/[lang]/dashboard", "layout");
  return { success: interpolate(E.success.withdraw, { amount: formatEuro(amount, locale) }) };
}

/* ==================== CARTE ==================== */
export async function toggleCardFrozen() {
  const { dict } = await ctx();
  const { userId, profile } = await getVerifiedProfile();
  const next = !profile.card_frozen;
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ card_frozen: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
  const n = next ? dict.emails.notify.cardFrozen : dict.emails.notify.cardUnfrozen;
  await notify(userId, n.title, n.body);
  revalidatePath("/[lang]/dashboard", "layout");
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
  const { dict } = await ctx();
  const E = dict.errors;
  const { userId, profile } = await getVerifiedProfile();
  const code = String(formData.get("code") ?? "").trim();
  if (!code)
    return { error: E.redeem.enterCode, progress: profile.withdrawal_progress };

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
      error: E.redeem.codeInvalid,
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
    return { error: E.redeem.updateFailed, progress: profile.withdrawal_progress };

  await admin
    .from("withdrawal_codes")
    .update({ status: "used", used_by: userId, used_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  const nP = dict.emails.notify.progressUpdated;
  await notify(
    userId,
    nP.title,
    interpolate(nP.body, { pct: codeRow.percentage_value, progress: newProgress }),
  );

  revalidatePath("/[lang]/dashboard", "layout");
  return {
    success: interpolate(E.success.redeem, {
      pct: codeRow.percentage_value,
      progress: newProgress,
    }),
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
  const { locale, dict } = await ctx();
  const E = dict.errors;
  const NT = dict.emails.notify;
  const { userId } = await getVerifiedProfile();
  const txId = String(formData.get("transaction_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!txId || !code) return { error: E.phase.codeRequired };

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
  if (!tx) return { error: E.phase.notFound };

  const currentPhase = tx.unlock_phase + 1;
  if (currentPhase > PHASE_TOTAL)
    return { error: E.phase.allConfirmed, phase: tx.unlock_phase };

  const { data: row } = await admin
    .from("transfer_phase_codes")
    .select("*")
    .eq("transaction_id", tx.id)
    .eq("phase", currentPhase)
    .eq("status", "code_envoye")
    .order("created_at", { ascending: false })
    .maybeSingle<{ id: string; code: string; attempts: number; expires_at: string }>();

  if (!row)
    return { error: E.phase.noCode, phase: tx.unlock_phase };

  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now) {
    await admin.from("transfer_phase_codes").update({ status: "expire" }).eq("id", row.id);
    return { error: E.phase.expired, phase: tx.unlock_phase };
  }
  if (row.attempts >= PHASE_MAX_ATTEMPTS) {
    await admin.from("transfer_phase_codes").update({ status: "expire" }).eq("id", row.id);
    return { error: E.phase.tooManyAttempts, phase: tx.unlock_phase };
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
        ? E.phase.incorrectExhausted
        : interpolate(E.phase.incorrectRemaining, { n: PHASE_MAX_ATTEMPTS - attempts }),
      phase: tx.unlock_phase,
    };
  }

  // Code correct → phase confirmée.
  const nowIso = new Date().toISOString();
  await admin
    .from("transfer_phase_codes")
    .update({ status: "valide", confirmed_at: nowIso })
    .eq("id", row.id);
  const { error: phaseErr } = await admin
    .from("transactions")
    .update({ unlock_phase: currentPhase })
    .eq("id", tx.id);
  if (phaseErr)
    return { error: E.phase.updateFailed, phase: tx.unlock_phase };

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

  // 3ᵉ phase confirmée → exécution effective du virement. C'est ICI, et
  // seulement ici, que le montant quitte le compte de l'émetteur : le solde
  // n'a jamais été touché avant la confirmation des 3 phases.
  if (currentPhase === PHASE_TOTAL) {
    const { data: senderRow } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle<{ balance: number }>();
    const senderBalance = Number(senderRow?.balance ?? 0);

    // Solde insuffisant au moment de l'exécution (a pu changer depuis la
    // soumission, puisque les fonds n'étaient pas réservés) → le virement
    // échoue, sans qu'aucun montant n'ait été débité.
    if (senderBalance < amount) {
      await admin
        .from("transactions")
        .update({
          status: "rejected",
          decline_reason: "Solde insuffisant au moment de l'exécution du virement.",
          reviewed_at: nowIso,
        })
        .eq("id", tx.id);
      await notify(userId, dict.emails.notify.transferRejected.title, E.transfer.insufficient);
      revalidatePath("/[lang]/dashboard", "layout");
      revalidatePath("/[lang]/admin/virements", "page");
      return { error: E.transfer.insufficient, phase: currentPhase };
    }

    await admin
      .from("profiles")
      .update({ balance: senderBalance - amount, updated_at: nowIso })
      .eq("id", userId);

    if (tx.counterparty_iban) {
      const { data: recipient } = await admin
        .from("profiles")
        .select("id, full_name, balance, status")
        .eq("iban", tx.counterparty_iban)
        .neq("role", "admin")
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
        const from = sender?.full_name
          ? interpolate(NT.transferReceived.fromName, { name: sender.full_name })
          : "";
        await notify(
          recipient.id,
          NT.transferReceived.title,
          interpolate(NT.transferReceived.body, {
            amount: formatEuro(amount, locale),
            from,
          }),
        );
      }
    }

    await admin
      .from("transactions")
      .update({ status: "success", reviewed_at: nowIso })
      .eq("id", tx.id);

    await notify(
      userId,
      NT.transferExecuted.title,
      interpolate(NT.transferExecuted.body, { amount: formatEuro(amount, locale) }),
    );
  } else {
    await notify(
      userId,
      interpolate(NT.phaseConfirmed.title, { phase: currentPhase, total: PHASE_TOTAL }),
      interpolate(NT.phaseConfirmed.body, {
        phase: currentPhase,
        amount: formatEuro(amount, locale),
      }),
      { email: false },
    );
  }

  revalidatePath("/[lang]/dashboard", "layout");
  revalidatePath("/[lang]/admin/virements", "page");
  return {
    success:
      currentPhase === PHASE_TOTAL
        ? E.success.transferUnlocked
        : interpolate(E.success.phaseConfirmed, { phase: currentPhase }),
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
  revalidatePath("/[lang]/dashboard", "layout");
}

/* ==================== PROFIL ==================== */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { dict } = await ctx();
  const { userId } = await getVerifiedProfile();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: dict.errors.profile.nameEmpty };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", userId);

  revalidatePath("/[lang]/dashboard", "layout");
  return { success: dict.errors.success.profileUpdated };
}

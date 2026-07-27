"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { canDeposit, canTransfer, canWithdraw, permissionReason } from "@/lib/permissions";
import { cleanIban, isPlausibleIban, formatEuro } from "@/lib/format";
import { validateIban } from "@/lib/ibanValidate";
import { PHASE_MAX_ATTEMPTS } from "@/lib/transferPhases";
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
  const beneficiaryName = String(formData.get("beneficiary_name") ?? "").trim();
  const bic = String(formData.get("bic") ?? "").trim().toUpperCase() || null;
  const bankName = String(formData.get("bank_name") ?? "").trim() || null;
  const currencyRaw = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : "EUR";

  if (amount === null) return { error: E.amount.invalid };
  if (!beneficiaryName) return { error: E.transfer.beneficiaryRequired };

  // Validation IBAN stricte (format → longueur pays → clé mod-97), avec un
  // message précis selon le type d'échec. Le mod-97 garantit la cohérence du
  // numéro, pas l'existence réelle du compte.
  const iv = validateIban(iban);
  if (!iv.valid) {
    if (iv.error === "format") return { error: E.transfer.ibanFormat };
    if (iv.error === "length")
      return { error: interpolate(E.transfer.ibanLength, { expected: iv.expectedLength ?? "?" }) };
    return { error: E.transfer.ibanChecksum };
  }
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

  // Le solde n'est PAS débité à la soumission : le virement reste « en
  // attente » et le montant n'est prélevé qu'à la confirmation de la 3ᵉ et
  // dernière phase par le client (voir confirmTransferPhase). Le contrôle de
  // solde suffisant ci-dessus n'est qu'indicatif ; il est revérifié à
  // l'exécution, au cas où le solde aurait changé entre-temps.
  const { data: inserted } = await admin
    .from("transactions")
    .insert({
      user_id: userId,
      type: "transfer",
      direction: "out",
      amount,
      status: "pending",
      counterparty_iban: iban,
      counterparty_name: beneficiaryName, // nom saisi par l'émetteur
      description,
    })
    .select("id")
    .single<{ id: string }>();

  // Champs additionnels (BIC, banque, devise) : mise à jour « best-effort »
  // — ignorée silencieusement si les colonnes n'existent pas encore côté DB
  // (voir migration 0003). Le virement reste valide sans elles.
  if (inserted?.id) {
    await admin
      .from("transactions")
      .update({ counterparty_bic: bic, counterparty_bank: bankName, currency })
      .eq("id", inserted.id)
      .then(undefined, () => {});
  }
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

  if (amount === null) return { error: E.amount.invalid };
  if (!accountId) return { error: E.withdraw.chooseIban };

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

  // Jauge à 100 % obligatoire : le retrait ne peut être lancé qu'une fois la
  // jauge complète (plus aucun code de validation à saisir).
  if (Number(profile.withdrawal_progress) < 100) {
    return { error: E.withdraw.gaugeIncomplete };
  }

  if (amount > Number(profile.balance)) return { error: E.withdraw.insufficient };

  // Retrait mis EN ATTENTE de traitement : le solde n'est pas débité tout de
  // suite, une notification informe le client que sa demande est en attente.
  await admin.from("transactions").insert({
    user_id: userId,
    type: "withdrawal",
    direction: "out",
    amount,
    status: "pending",
    counterparty_iban: account.iban,
    description: "Retrait en attente",
  });
  const nWP = dict.emails.notify.withdrawalPending;
  await notify(
    userId,
    nWP.title,
    interpolate(nWP.body, { amount: formatEuro(amount, locale), iban: account.iban }),
  );

  revalidatePath("/[lang]/dashboard", "layout");
  return { success: interpolate(E.success.withdrawPending, { amount: formatEuro(amount, locale) }) };
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
  const { dict } = await ctx();
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

  // Code correct → étape confirmée. AUCUN débit ici : l'exécution du virement
  // (débit émetteur + crédit bénéficiaire) est déclenchée séparément par
  // l'admin via `executeTransfer`. Le client ne voit jamais de numéro d'étape.
  const nowIso = new Date().toISOString();
  await admin
    .from("transfer_phase_codes")
    .update({ status: "valide", confirmed_at: nowIso })
    .eq("id", row.id);
  const { error: stepErr } = await admin
    .from("transactions")
    .update({ unlock_phase: currentPhase })
    .eq("id", tx.id);
  if (stepErr) return { error: E.phase.updateFailed, phase: tx.unlock_phase };

  // Traçabilité (sans exposer de numéro d'étape au client).
  await admin.from("admin_audit_log").insert({
    admin_id: null,
    admin_email: null,
    action: "transfer.code.confirm",
    target_user_id: userId,
    reason: null,
    details: { tx_id: tx.id, step: currentPhase },
  });

  // Notification générique (aucune mention d'étape ni de numéro).
  await notify(userId, NT.transferStepConfirmed.title, NT.transferStepConfirmed.body, {
    email: false,
  });

  revalidatePath("/[lang]/dashboard", "layout");
  revalidatePath("/[lang]/admin/virements", "page");
  return { success: E.success.codeConfirmed, phase: currentPhase };
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

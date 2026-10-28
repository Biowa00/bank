import { createAdminClient } from "@/lib/supabase/admin";
import type { Transaction } from "@/lib/types";
import { isCodePending } from "@/lib/transferPhases";
import { formatAccountDestination } from "@/lib/accountTransfer";

export type PendingTransfer = {
  id: string;
  amount: number;
  counterparty_iban: string | null;
  /** Compte hors IBAN (« •••1234 · CHASUS33 ») si virement par numéro de compte. */
  counterparty_account: string | null;
  /** true si un code est en attente de saisie par le client. */
  awaitingCode: boolean;
  /** Motif/intitulé du code actif, affiché au client (ou null). */
  codeLabel: string | null;
};

/**
 * Virements sortants en attente d'un utilisateur. Pour chacun, indique s'il y a
 * un code actif à saisir et son motif — sans exposer de numéro d'étape.
 */
export async function getPendingTransfers(userId: string): Promise<PendingTransfer[]> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "transfer")
    .eq("status", "pending")
    .eq("direction", "out")
    .order("created_at", { ascending: false })
    .returns<Pick<Transaction, "id" | "amount" | "counterparty_iban" | "unlock_phase" | "counterparty_account_number" | "counterparty_bic">[]>();

  const rows = pending ?? [];
  if (rows.length === 0) return [];

  const { data: codes } = await admin
    .from("transfer_phase_codes")
    .select("transaction_id, phase, label, status, expires_at")
    .in("transaction_id", rows.map((t) => t.id))
    .returns<{ transaction_id: string; phase: number; label: string | null; status: string; expires_at: string }[]>();

  return rows.map((t) => {
    const active = (codes ?? []).find(
      (c) => c.transaction_id === t.id && c.phase === t.unlock_phase + 1 && isCodePending(c.status, c.expires_at),
    );
    return {
      id: t.id,
      amount: Number(t.amount),
      counterparty_iban: t.counterparty_iban,
      counterparty_account: t.counterparty_account_number
        ? formatAccountDestination(t.counterparty_account_number, t.counterparty_bic)
        : null,
      awaitingCode: Boolean(active),
      codeLabel: active?.label ?? null,
    };
  });
}

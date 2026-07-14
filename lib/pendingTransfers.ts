import { createAdminClient } from "@/lib/supabase/admin";
import { isCodeActive } from "@/lib/transferPhases";

export type PendingTransfer = {
  id: string;
  amount: number;
  counterparty_iban: string | null;
  unlock_phase: number;
  /** true si un code est en attente de confirmation pour la phase en cours. */
  awaitingCode: boolean;
};

/** Virements sortants en attente (déblocage en 3 phases) d'un utilisateur. */
export async function getPendingTransfers(userId: string): Promise<PendingTransfer[]> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("transactions")
    .select("id, amount, counterparty_iban, unlock_phase")
    .eq("user_id", userId)
    .eq("type", "transfer")
    .eq("status", "pending")
    .eq("direction", "out")
    .order("created_at", { ascending: false })
    .returns<{ id: string; amount: number; counterparty_iban: string | null; unlock_phase: number }[]>();

  const rows = pending ?? [];
  if (rows.length === 0) return [];

  const { data: codes } = await admin
    .from("transfer_phase_codes")
    .select("transaction_id, phase, status, expires_at")
    .in("transaction_id", rows.map((t) => t.id))
    .returns<{ transaction_id: string; phase: number; status: string; expires_at: string }[]>();

  return rows.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    counterparty_iban: t.counterparty_iban,
    unlock_phase: t.unlock_phase,
    awaitingCode: (codes ?? []).some(
      (c) => c.transaction_id === t.id && c.phase === t.unlock_phase + 1 && isCodeActive(c.status, c.expires_at),
    ),
  }));
}

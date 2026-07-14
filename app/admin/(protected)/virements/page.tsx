import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuro, formatIban, formatDate } from "@/lib/format";
import { TransferReview, type PhaseState } from "@/components/admin/TransferReview";
import { isCodeActive } from "@/lib/transferPhases";
import type { Profile, Transaction, TransferPhaseCode } from "@/lib/types";

export default async function VirementsPage() {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("transactions")
    .select("*")
    .eq("type", "transfer")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<Transaction[]>();

  const list = pending ?? [];
  const txIds = list.map((t) => t.id);

  const senderIds = [...new Set(list.map((t) => t.user_id))];
  const senderMap = new Map<string, Profile>();
  if (senderIds.length) {
    const { data: senders } = await admin
      .from("profiles")
      .select("id, full_name, email, iban, balance")
      .in("id", senderIds)
      .returns<Profile[]>();
    (senders ?? []).forEach((s) => senderMap.set(s.id, s));
  }

  let codes: TransferPhaseCode[] = [];
  if (txIds.length) {
    const { data } = await admin
      .from("transfer_phase_codes")
      .select("*")
      .in("transaction_id", txIds)
      .returns<TransferPhaseCode[]>();
    codes = data ?? [];
  }

  const phasesFor = (tx: Transaction): { phase: number; state: PhaseState }[] =>
    [1, 2, 3].map((phase) => {
      let state: PhaseState;
      if (phase <= tx.unlock_phase) state = "valide";
      else if (phase === tx.unlock_phase + 1) {
        const active = codes.find(
          (c) => c.transaction_id === tx.id && c.phase === phase && isCodeActive(c.status, c.expires_at),
        );
        state = active ? "attente" : "a_valider";
      } else state = "verrouille";
      return { phase, state };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Virements à valider</h1>
        <p className="mt-1 text-ink/60">
          Déblocage en 3 phases : validez chaque phase, le client confirme le code reçu avant la suivante.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-ink/50">Aucun virement en attente. 🎉</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((tx) => {
            const sender = senderMap.get(tx.user_id);
            return (
              <div key={tx.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {sender ? (
                      <Link href={`/admin/users/${sender.id}`} className="font-medium text-ink hover:underline">
                        {sender.full_name || sender.email}
                      </Link>
                    ) : (
                      <p className="font-medium text-ink">Client inconnu</p>
                    )}
                    <p className="truncate text-xs text-ink/50">{sender?.email}</p>
                  </div>
                  <span className="badge shrink-0 bg-amber-500/10 text-amber-600">{tx.unlock_phase}/3 phases</span>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <Row label="Montant" value={<span className="font-semibold text-ink">{formatEuro(Number(tx.amount))}</span>} />
                  <Row label="Vers (IBAN)" value={<span className="font-mono text-xs">{tx.counterparty_iban ? formatIban(tx.counterparty_iban) : "—"}</span>} />
                  {tx.counterparty_name && <Row label="Bénéficiaire" value={tx.counterparty_name} />}
                  {tx.description && <Row label="Motif" value={tx.description} />}
                  <Row label="Soumis le" value={<span className="text-ink/60">{formatDate(tx.created_at)}</span>} />
                </div>

                <div className="mt-4 border-t border-black/5 pt-4">
                  <TransferReview txId={tx.id} phases={phasesFor(tx)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink/50">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  );
}

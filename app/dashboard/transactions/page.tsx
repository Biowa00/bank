import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { TransferPhaseConfirm } from "@/components/dashboard/TransferPhaseConfirm";
import { getPendingTransfers } from "@/lib/pendingTransfers";
import type { Transaction, TxType, TxStatus } from "@/lib/types";

const typeFilters: { key: string; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "deposit", label: "Dépôts" },
  { key: "transfer", label: "Virements" },
  { key: "withdrawal", label: "Retraits" },
];
const statusFilters: { key: string; label: string }[] = [
  { key: "all", label: "Tous statuts" },
  { key: "success", label: "Réussi" },
  { key: "pending", label: "En attente" },
  { key: "rejected", label: "Refusé" },
  { key: "blocked", label: "Bloqué" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { userId } = await requireUser();
  const sp = await searchParams;
  const type = sp.type ?? "all";
  const status = sp.status ?? "all";

  const pendingTransfers = await getPendingTransfers(userId);

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (type !== "all") query = query.eq("type", type as TxType);
  if (status !== "all") query = query.eq("status", status as TxStatus);

  const { data: txs } = await query.returns<Transaction[]>();

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-ink text-white" : "bg-white text-ink/60 border border-black/10 hover:text-ink"
    }`;

  return (
    <div className="space-y-5">
      <PageHeader title="Historique des transactions" subtitle="Filtrez par type et par statut." />

      <TransferPhaseConfirm transfers={pendingTransfers} />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((f) => (
            <Link key={f.key} href={{ query: { type: f.key, status } }} className={chip(type === f.key)}>
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <Link key={f.key} href={{ query: { type, status: f.key } }} className={chip(status === f.key)}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="divide-y divide-black/5">
          {txs && txs.length > 0 ? (
            txs.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <p className="py-10 text-center text-sm text-ink/50">
              Aucune transaction ne correspond à ces filtres.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

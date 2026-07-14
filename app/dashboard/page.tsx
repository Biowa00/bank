import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { BankCard } from "@/components/dashboard/BankCard";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { TransferPhaseConfirm } from "@/components/dashboard/TransferPhaseConfirm";
import { getPendingTransfers } from "@/lib/pendingTransfers";
import type { Transaction } from "@/lib/types";

export default async function DashboardHome() {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: txs } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<Transaction[]>();

  const pendingTransfers = await getPendingTransfers(userId);

  const firstName = (profile.full_name ?? "").split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Bonjour{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-ink/60">Voici l&apos;état de votre compte Nébula.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceCard
          balance={Number(profile.balance)}
          iban={profile.iban}
          status={profile.status}
          name={profile.full_name}
        />
        <BankCard
          iban={profile.iban}
          createdAt={profile.created_at}
          holderName={profile.full_name}
          frozen={profile.card_frozen}
        />
      </div>

      <TransferPhaseConfirm transfers={pendingTransfers} />

      {/* Actions rapides */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction href="/dashboard/depot" label="Déposer" icon="M12 4v12m0 0l4-4m-4 4l-4-4M4 20h16" />
        <QuickAction href="/dashboard/virement" label="Virer" icon="M4 12h16m0 0l-5-5m5 5l-5 5" />
        <QuickAction href="/dashboard/retrait" label="Retirer" icon="M12 20V8m0 0l4 4m-4-4l-4 4M4 4h16" />
      </div>

      {/* Transactions récentes */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Transactions récentes</h2>
          <Link href="/dashboard/transactions" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Tout voir
          </Link>
        </div>
        <div className="mt-2 divide-y divide-black/5">
          {txs && txs.length > 0 ? (
            txs.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <p className="py-8 text-center text-sm text-ink/50">
              Aucune transaction pour le moment. Faites votre premier dépôt !
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="card flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-0.5"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d={icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
    </Link>
  );
}

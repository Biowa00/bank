import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuro, formatIban } from "@/lib/format";
import { AccountStatusBadge } from "@/components/StatusBadge";
import { WithdrawalGauge } from "@/components/WithdrawalGauge";
import type { Profile, AccountStatus } from "@/lib/types";

const statusTabs: { key: string; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "restricted", label: "Restreints" },
  { key: "banned", label: "Bannis" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "all";

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("*")
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status as AccountStatus);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,iban.ilike.%${q}%`);

  const { data: users } = await query.returns<Profile[]>();

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-ink text-white" : "bg-white text-ink/60 border border-black/10 hover:text-ink"
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Utilisateurs</h1>
        <p className="mt-1 text-ink/60">Recherchez et gérez les comptes clients.</p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          className="input max-w-sm"
          placeholder="Rechercher par nom, e-mail ou IBAN…"
        />
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="btn-primary">Rechercher</button>
      </form>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((t) => (
          <Link key={t.key} href={{ query: { status: t.key, ...(q ? { q } : {}) } }} className={chip(status === t.key)}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="hidden grid-cols-[1.5fr_1fr_1.1fr_auto] gap-4 border-b border-black/5 px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink/40 md:grid">
          <span>Client</span>
          <span>Solde</span>
          <span>Jauge de retrait</span>
          <span>Statut</span>
        </div>
        <div className="divide-y divide-black/5">
          {users && users.length > 0 ? (
            users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-1 gap-2 px-6 py-4 transition-colors hover:bg-black/[.02] md:grid-cols-[1.5fr_1fr_1.1fr_auto] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.full_name || "—"}</p>
                  <p className="truncate text-xs text-ink/50">{u.email}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-ink/30">{u.iban ? formatIban(u.iban) : "—"}</p>
                </div>
                <p className="font-semibold text-ink">{formatEuro(Number(u.balance))}</p>
                <div className="max-w-[180px]">
                  <WithdrawalGauge progress={u.withdrawal_progress} size="sm" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AccountStatusBadge status={u.status} />
                  {!u.deposit_authorized && (
                    <span className="badge bg-amber-500/10 text-amber-600" title="Dépôts non autorisés">Dépôts ⛔</span>
                  )}
                  {u.withdrawals_blocked && (
                    <span className="badge bg-red-500/10 text-red-600" title="Retraits bloqués">Retraits 🔒</span>
                  )}
                  {u.transfers_blocked && (
                    <span className="badge bg-red-500/10 text-red-600" title="Virements bloqués">Virements 🔒</span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <p className="py-12 text-center text-sm text-ink/50">Aucun utilisateur trouvé.</p>
          )}
        </div>
      </div>
    </div>
  );
}

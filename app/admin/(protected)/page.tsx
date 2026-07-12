import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuro, formatDate } from "@/lib/format";
import { AccountStatusBadge } from "@/components/StatusBadge";
import type { Profile, AuditLog } from "@/lib/types";

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: audit }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>(),
    admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(6).returns<AuditLog[]>(),
  ]);

  const all = profiles ?? [];
  const users = all.filter((p) => p.role === "user");
  const totalBalance = users.reduce((s, p) => s + Number(p.balance), 0);
  const counts = {
    active: users.filter((p) => p.status === "active").length,
    restricted: users.filter((p) => p.status === "restricted").length,
    banned: users.filter((p) => p.status === "banned").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Tableau de bord</h1>
        <p className="mt-1 text-ink/60">Vue d&apos;ensemble de la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={String(users.length)} />
        <Stat label="Solde total" value={formatEuro(totalBalance)} />
        <Stat label="Comptes restreints" value={String(counts.restricted)} tone="amber" />
        <Stat label="Comptes bannis" value={String(counts.banned)} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Derniers inscrits */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Derniers inscrits</h2>
            <Link href="/admin/users" className="text-sm font-medium text-brand-600 hover:text-brand-700">Tout voir</Link>
          </div>
          <div className="mt-3 divide-y divide-black/5">
            {users.slice(0, 6).map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between py-3 hover:opacity-70">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.full_name || "—"}</p>
                  <p className="truncate text-xs text-ink/50">{u.email}</p>
                </div>
                <AccountStatusBadge status={u.status} />
              </Link>
            ))}
            {users.length === 0 && <p className="py-8 text-center text-sm text-ink/50">Aucun utilisateur.</p>}
          </div>
        </div>

        {/* Journal récent */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Actions récentes</h2>
            <Link href="/admin/audit" className="text-sm font-medium text-brand-600 hover:text-brand-700">Journal</Link>
          </div>
          <div className="mt-3 divide-y divide-black/5">
            {(audit ?? []).map((a) => (
              <div key={a.id} className="py-3">
                <p className="text-sm font-medium text-ink">
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">{a.action}</code>
                </p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {a.admin_email ?? "—"} · {formatDate(a.created_at)}
                </p>
              </div>
            ))}
            {(!audit || audit.length === 0) && <p className="py-8 text-center text-sm text-ink/50">Aucune action.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "red" }) {
  const color =
    tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-ink";
  return (
    <div className="card p-5">
      <p className="text-sm text-ink/50">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

import { connection } from "next/server";
import { LocaleLink as Link } from "@/components/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import type { AuditLog, Profile } from "@/lib/types";

const actionLabels: Record<string, string> = {
  "account.active": "Compte réactivé",
  "account.restricted": "Compte restreint",
  "account.banned": "Compte banni",
  "withdrawals.block": "Retraits bloqués",
  "withdrawals.unblock": "Retraits débloqués",
  "transfers.block": "Virements bloqués",
  "transfers.unblock": "Virements débloqués",
  "code.create": "Code créé",
  "code.revoke": "Code révoqué",
};

export default async function AuditPage() {
  await connection();
  const admin = createAdminClient();
  const [{ data: logs }, { data: users }] = await Promise.all([
    admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(300).returns<AuditLog[]>(),
    admin.from("profiles").select("id, full_name, email").returns<Profile[]>(),
  ]);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Journal d&apos;audit</h1>
        <p className="mt-1 text-ink/60">
          Historique inaltérable de toutes les actions administrateur.
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="hidden grid-cols-[1fr_1.2fr_1fr_1.4fr] gap-4 border-b border-black/5 px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink/40 md:grid">
          <span>Action</span>
          <span>Administrateur</span>
          <span>Client concerné</span>
          <span>Motif / date</span>
        </div>
        <div className="divide-y divide-black/5">
          {logs && logs.length > 0 ? (
            logs.map((l) => {
              const target = l.target_user_id ? userMap.get(l.target_user_id) : null;
              return (
                <div key={l.id} className="grid grid-cols-1 gap-1 px-6 py-4 md:grid-cols-[1fr_1.2fr_1fr_1.4fr] md:items-center md:gap-4">
                  <span className="font-medium text-ink">
                    {actionLabels[l.action] ?? l.action}
                  </span>
                  <span className="truncate text-sm text-ink/60">{l.admin_email ?? "—"}</span>
                  <span className="truncate text-sm text-ink/60">
                    {target ? (
                      <Link href={`/admin/users/${target.id}`} className="text-brand-600 hover:underline">
                        {target.full_name || target.email}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="text-xs text-ink/50">
                    {l.reason ? <span className="text-ink/70">{l.reason} · </span> : null}
                    {formatDate(l.created_at)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="py-12 text-center text-sm text-ink/50">Aucune action enregistrée.</p>
          )}
        </div>
      </div>
    </div>
  );
}

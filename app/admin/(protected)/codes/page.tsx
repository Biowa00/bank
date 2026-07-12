import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { CodeStatusBadge } from "@/components/StatusBadge";
import { CreateCodeForm } from "@/components/admin/CreateCodeForm";
import { revokeWithdrawalCode } from "@/app/admin/actions";
import type { Profile, WithdrawalCode } from "@/lib/types";

export default async function CodesPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  const admin = createAdminClient();

  const [{ data: codes }, { data: users }] = await Promise.all([
    admin.from("withdrawal_codes").select("*").order("created_at", { ascending: false }).returns<WithdrawalCode[]>(),
    admin.from("profiles").select("id, full_name, email, iban").eq("role", "user").order("full_name").returns<Profile[]>(),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const userOpts = (users ?? []).map((u) => ({
    id: u.id,
    label: `${u.full_name || "—"} (${u.email})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Codes de retrait</h1>
        <p className="mt-1 text-ink/60">Créez et gérez les codes requis pour valider les retraits.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Création */}
        <div className="card h-fit p-6">
          <h2 className="mb-4 font-semibold text-ink">Nouveau code</h2>
          <CreateCodeForm users={userOpts} defaultTarget={target} />
        </div>

        {/* Liste */}
        <div className="card p-6">
          <h2 className="mb-3 font-semibold text-ink">Codes existants</h2>
          <div className="divide-y divide-black/5">
            {codes && codes.length > 0 ? (
              codes.map((c) => {
                const targetUser = c.target_user_id ? userMap.get(c.target_user_id) : null;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-ink">{c.name}</p>
                        <CodeStatusBadge status={c.status} />
                      </div>
                      <p className="font-mono text-sm text-ink/70">{c.code}</p>
                      <p className="truncate text-xs text-ink/50">
                        {targetUser ? `Ciblé : ${targetUser.full_name || targetUser.email}` : "Générique"}
                        {c.reason ? ` · ${c.reason}` : ""} · {formatDate(c.created_at)}
                      </p>
                    </div>
                    {c.status === "active" && (
                      <form action={revokeWithdrawalCode}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700">
                          Révoquer
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-ink/50">Aucun code créé.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

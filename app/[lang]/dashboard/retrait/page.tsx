import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canWithdraw, permissionReason } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WithdrawForm } from "@/components/dashboard/WithdrawForm";
import { WithdrawalAccounts } from "@/components/dashboard/WithdrawalAccounts";
import { WithdrawalProgress } from "@/components/dashboard/WithdrawalProgress";
import { getRequestDictionary } from "../../dictionaries";
import type { WithdrawalAccount } from "@/lib/types";

export default async function RetraitPage() {
  const t = (await getRequestDictionary()).dashboard;
  const { userId, profile } = await requireUser();
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("withdrawal_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<WithdrawalAccount[]>();

  const perm = canWithdraw(profile);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={t.withdraw.title}
        subtitle={t.withdraw.subtitle}
      />

      <WithdrawalProgress initialProgress={profile.withdrawal_progress} />

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">{t.withdraw.newWithdrawal}</h2>
        {perm.allowed ? (
          <WithdrawForm accounts={accounts ?? []} balance={Number(profile.balance)} />
        ) : (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {permissionReason(perm, t.permissions)}
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-1 font-semibold text-ink">{t.withdraw.savedIbansTitle}</h2>
        <p className="mb-4 text-sm text-ink/50">
          {t.withdraw.savedIbansDesc}
        </p>
        <WithdrawalAccounts accounts={accounts ?? []} />
      </div>
    </div>
  );
}

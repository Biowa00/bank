import { requireUser } from "@/lib/auth";
import { canTransfer, permissionReason } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TransferForm } from "@/components/dashboard/TransferForm";
import { getRequestDictionary } from "../../dictionaries";

export default async function VirementPage() {
  const t = (await getRequestDictionary()).dashboard;
  const { profile } = await requireUser();
  const perm = canTransfer(profile);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t.transfer.title} subtitle={t.transfer.subtitle} />
      <div className="card p-6">
        {perm.allowed ? (
          <TransferForm balance={Number(profile.balance)} />
        ) : (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {permissionReason(perm, t.permissions)}
          </p>
        )}
      </div>
    </div>
  );
}

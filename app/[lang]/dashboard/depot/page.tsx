import { requireUser } from "@/lib/auth";
import { canDeposit, permissionReason } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DepositForm } from "@/components/dashboard/DepositForm";
import { getRequestDictionary } from "../../dictionaries";

export default async function DepotPage() {
  const t = (await getRequestDictionary()).dashboard;
  const { profile } = await requireUser();
  const perm = canDeposit(profile);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t.deposit.title} subtitle={t.deposit.subtitle} />
      <div className="card p-6">
        {perm.allowed ? (
          <DepositForm />
        ) : (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {permissionReason(perm, t.permissions)}
          </p>
        )}
      </div>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { canDeposit } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DepositForm } from "@/components/dashboard/DepositForm";

export default async function DepotPage() {
  const { profile } = await requireUser();
  const perm = canDeposit(profile);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Déposer des fonds" subtitle="Créditez votre solde instantanément." />
      <div className="card p-6">
        {perm.allowed ? (
          <DepositForm />
        ) : (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {perm.reason}
          </p>
        )}
      </div>
    </div>
  );
}

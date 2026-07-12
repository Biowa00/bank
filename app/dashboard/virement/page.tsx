import { requireUser } from "@/lib/auth";
import { canTransfer } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TransferForm } from "@/components/dashboard/TransferForm";

export default async function VirementPage() {
  const { profile } = await requireUser();
  const perm = canTransfer(profile);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Effectuer un virement" subtitle="Envoyez de l'argent vers un IBAN de votre choix." />
      <div className="card p-6">
        {perm.allowed ? (
          <TransferForm balance={Number(profile.balance)} />
        ) : (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {perm.reason}
          </p>
        )}
      </div>
    </div>
  );
}

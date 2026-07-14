import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { AccountStatusBadge } from "@/components/StatusBadge";
import { formatIban, formatDate } from "@/lib/format";

export default async function ProfilPage() {
  const { email, profile } = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profil" subtitle="Vos informations personnelles et votre compte." />

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink/50">Statut du compte</p>
            <div className="mt-1">
              <AccountStatusBadge status={profile.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/50">IBAN</p>
            <p className="mt-1 font-mono text-sm text-ink">{profile.iban ? formatIban(profile.iban) : "—"}</p>
          </div>
        </div>
        {profile.status_reason && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Motif :</strong> {profile.status_reason}
          </p>
        )}
        <p className="mt-4 text-xs text-ink/40">
          Compte créé le {formatDate(profile.created_at)}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">Informations</h2>
        <ProfileForm fullName={profile.full_name ?? ""} email={email} />
      </div>
    </div>
  );
}

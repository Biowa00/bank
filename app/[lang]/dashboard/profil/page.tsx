import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { AccountStatusBadge } from "@/components/StatusBadge";
import { formatIban, formatDate } from "@/lib/format";
import { getRequestDictionary } from "../../dictionaries";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function ProfilPage() {
  const locale = await getRequestLocale();
  const dict = await getRequestDictionary();
  const t = dict.dashboard.profile;
  const { email, profile } = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink/50">{t.accountStatus}</p>
            <div className="mt-1">
              <AccountStatusBadge status={profile.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/50">{dict.common.account.iban}</p>
            <p className="mt-1 font-mono text-sm text-ink">{profile.iban ? formatIban(profile.iban) : "—"}</p>
          </div>
        </div>
        {profile.status_reason && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>{t.reason}</strong> {profile.status_reason}
          </p>
        )}
        <p className="mt-4 text-xs text-ink/40">
          {t.createdOn.replace("{date}", formatDate(profile.created_at, locale))}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">{t.infoSection}</h2>
        <ProfileForm fullName={profile.full_name ?? ""} email={email} />
      </div>
    </div>
  );
}

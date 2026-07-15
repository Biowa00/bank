import { LocaleLink as Link } from "@/components/i18n/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuro, formatIban, formatDate } from "@/lib/format";
import { AccountStatusBadge, CodeStatusBadge } from "@/components/StatusBadge";
import { WithdrawalGauge } from "@/components/WithdrawalGauge";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { RestrictionToggles } from "@/components/admin/RestrictionToggles";
import { AdminCreditForm } from "@/components/admin/AdminCreditForm";
import { GaugeCodeGenerator } from "@/components/admin/GaugeCodeGenerator";
import type { Profile, Transaction, WithdrawalCode } from "@/lib/types";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (!user) notFound();

  const [{ data: txs }, { data: codes }] = await Promise.all([
    admin.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50).returns<Transaction[]>(),
    admin.from("withdrawal_codes").select("*").eq("target_user_id", id).order("created_at", { ascending: false }).returns<WithdrawalCode[]>(),
  ]);

  // Lien temporaire (5 min) vers la pièce d'identité dans le bucket privé.
  let docUrl: string | null = null;
  if (user.id_document_path) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(user.id_document_path, 300);
    docUrl = signed?.signedUrl ?? null;
  }
  const isPdf = (user.id_document_path ?? "").toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-ink/50 hover:text-ink">← Retour aux utilisateurs</Link>

      {/* En-tête */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-ink">{user.full_name || "—"}</h1>
              <AccountStatusBadge status={user.status} />
            </div>
            <p className="mt-1 text-sm text-ink/60">{user.email}</p>
            <p className="mt-2 font-mono text-sm text-ink/70">{user.iban ? formatIban(user.iban) : "—"}</p>
            <p className="mt-1 text-xs text-ink/40">Inscrit le {formatDate(user.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/50">Solde</p>
            <p className="text-3xl font-bold text-ink">{formatEuro(Number(user.balance))}</p>
          </div>
        </div>

        {/* Jauge de retrait */}
        <div className="mt-5 border-t border-black/5 pt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink/40">
            <span>Jauge de retrait</span>
          </div>
          <WithdrawalGauge progress={user.withdrawal_progress} />
        </div>

        {user.status_reason && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Motif du statut :</strong> {user.status_reason}
          </p>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-ink">Informations personnelles</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <Info label="Nom de famille" value={user.last_name} />
          <Info label="Nom (prénom)" value={user.first_name} />
          <Info label="Ville" value={user.city} />
          <Info label="Profession" value={user.profession} />
          <Info label="Téléphone" value={user.phone} />
          <Info label="E-mail" value={user.email} />
          <div className="sm:col-span-2">
            <Info label="Adresse complète" value={user.address} />
          </div>
        </dl>
        <div className="mt-5 border-t border-black/5 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">Pièce d&apos;identité fournie à l&apos;inscription</p>
          {docUrl ? (
            <div className="space-y-3">
              {isPdf ? (
                <embed src={docUrl} type="application/pdf" className="h-96 w-full rounded-xl border border-black/10" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={docUrl}
                  alt="Pièce d'identité"
                  className="max-h-96 w-auto rounded-xl border border-black/10 object-contain"
                />
              )}
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M14 3v4a1 1 0 001 1h4M5 3h9l6 6v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ouvrir en plein écran
              </a>
            </div>
          ) : (
            <p className="text-sm text-ink/40">Aucun document fourni.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MODULE 1 — Commutateurs de restriction */}
        <div className="card p-6">
          <h2 className="mb-1 font-semibold text-ink">Restrictions du compte</h2>
          <p className="mb-4 text-sm text-ink/50">Chaque bascule est appliquée immédiatement.</p>
          <RestrictionToggles
            userId={user.id}
            banned={user.status === "banned"}
            depositAuthorized={user.deposit_authorized}
            withdrawalBlocked={user.withdrawals_blocked}
            transferBlocked={user.transfers_blocked}
          />
        </div>

        {/* MODULE 2 — Créditer / ajuster */}
        <div className="card h-fit p-6">
          <h2 className="mb-1 font-semibold text-ink">Créditer / ajuster le compte</h2>
          <p className="mb-4 text-sm text-ink/50">Met à jour le solde et journalise une transaction.</p>
          <AdminCreditForm userId={user.id} />
        </div>
      </div>

      {/* MODULE 3 — Générateur de code d'incrémentation */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card h-fit p-6">
          <h2 className="mb-1 font-semibold text-ink">Code d&apos;incrémentation de la jauge</h2>
          <p className="mb-4 text-sm text-ink/50">Génère un code de retrait ciblé sur ce client.</p>
          <GaugeCodeGenerator userId={user.id} />
        </div>

        {/* Codes ciblés existants */}
        <div className="card p-6">
          <h2 className="mb-3 font-semibold text-ink">Codes ciblés sur ce client</h2>
          <div className="divide-y divide-black/5">
            {codes && codes.length > 0 ? (
              codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <CodeStatusBadge status={c.status} />
                    </div>
                    <p className="font-mono text-sm text-ink/70">{c.code}</p>
                  </div>
                  {c.percentage_value > 0 && (
                    <span className="badge shrink-0 bg-brand-500/10 text-brand-600">+{c.percentage_value}%</span>
                  )}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-ink/50">Aucun code ciblé sur ce client.</p>
            )}
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="card p-6">
        <h2 className="mb-2 font-semibold text-ink">Historique des transactions</h2>
        <div className="divide-y divide-black/5">
          {txs && txs.length > 0 ? (
            txs.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
          ) : (
            <p className="py-8 text-center text-sm text-ink/50">Aucune transaction.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

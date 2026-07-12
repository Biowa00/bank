import type { AccountStatus, TxStatus, CodeStatus } from "@/lib/types";

const account: Record<AccountStatus, { label: string; cls: string; dot: string }> = {
  active: { label: "Actif", cls: "bg-accent-500/10 text-accent-600", dot: "bg-accent-500" },
  restricted: { label: "Restreint", cls: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  banned: { label: "Banni", cls: "bg-red-500/10 text-red-600", dot: "bg-red-500" },
};

const tx: Record<TxStatus, { label: string; cls: string }> = {
  success: { label: "Réussi", cls: "bg-accent-500/10 text-accent-600" },
  pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-600" },
  blocked: { label: "Bloqué", cls: "bg-red-500/10 text-red-600" },
  rejected: { label: "Refusé", cls: "bg-red-500/10 text-red-600" },
};

const code: Record<CodeStatus, { label: string; cls: string }> = {
  active: { label: "Actif", cls: "bg-accent-500/10 text-accent-600" },
  used: { label: "Utilisé", cls: "bg-black/5 text-black/50" },
  revoked: { label: "Révoqué", cls: "bg-red-500/10 text-red-600" },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const s = account[status];
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function TxStatusBadge({ status }: { status: TxStatus }) {
  const s = tx[status];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function CodeStatusBadge({ status }: { status: CodeStatus }) {
  const s = code[status];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

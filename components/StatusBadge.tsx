"use client";

import { useZone } from "@/components/i18n/DictionaryProvider";
import type { AccountStatus, TxStatus, CodeStatus } from "@/lib/types";

const account: Record<AccountStatus, { cls: string; dot: string }> = {
  active: { cls: "bg-accent-500/10 text-accent-600", dot: "bg-accent-500" },
  restricted: { cls: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  banned: { cls: "bg-red-500/10 text-red-600", dot: "bg-red-500" },
};

const tx: Record<TxStatus, string> = {
  success: "bg-accent-500/10 text-accent-600",
  pending: "bg-amber-500/10 text-amber-600",
  blocked: "bg-red-500/10 text-red-600",
  rejected: "bg-red-500/10 text-red-600",
};

const code: Record<CodeStatus, string> = {
  active: "bg-accent-500/10 text-accent-600",
  used: "bg-black/5 text-black/50",
  revoked: "bg-red-500/10 text-red-600",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const labels = useZone("common").statuses.account;
  const s = account[status];
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {labels[status]}
    </span>
  );
}

export function TxStatusBadge({ status }: { status: TxStatus }) {
  const labels = useZone("common").statuses.tx;
  return <span className={`badge ${tx[status]}`}>{labels[status]}</span>;
}

export function CodeStatusBadge({ status }: { status: CodeStatus }) {
  const labels = useZone("common").statuses.code;
  return <span className={`badge ${code[status]}`}>{labels[status]}</span>;
}

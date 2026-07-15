"use client";

import { formatEuro, formatDate } from "@/lib/format";
import { TxStatusBadge } from "@/components/StatusBadge";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import type { Transaction } from "@/lib/types";

const icons: Record<Transaction["type"], string> = {
  deposit: "M12 4v12m0 0l4-4m-4 4l-4-4M4 20h16",
  transfer: "M4 12h16m0 0l-5-5m5 5l-5 5",
  withdrawal: "M12 20V8m0 0l4 4m-4-4l-4 4M4 4h16",
  admin_credit: "M12 4v12m0 0l4-4m-4 4l-4-4M4 20h16",
};

export function TransactionItem({ tx }: { tx: Transaction }) {
  const t = useZone("dashboard").transactionItem;
  const locale = useLocale();
  const label = t.types[tx.type];
  const icon = icons[tx.type];
  const credit = tx.direction === "in";
  const voided = tx.status === "blocked" || tx.status === "rejected";

  return (
    <div className="flex items-center gap-4 px-1 py-3.5">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          credit ? "bg-accent-500/10 text-accent-600" : "bg-black/5 text-ink/60"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d={icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink">{label}</p>
          {tx.status !== "success" && <TxStatusBadge status={tx.status} />}
        </div>
        <p className="truncate text-xs text-ink/50">
          {tx.counterparty_name
            ? `${tx.counterparty_name} · `
            : ""}
          {tx.counterparty_iban ?? tx.description ?? "—"} · {formatDate(tx.created_at, locale)}
        </p>
        {tx.status === "rejected" && tx.decline_reason && (
          <p className="mt-0.5 truncate text-xs text-red-600">{t.declineReason} {tx.decline_reason}</p>
        )}
      </div>
      <span
        className={`shrink-0 font-semibold ${
          voided
            ? "text-ink/30 line-through"
            : credit
              ? "text-accent-600"
              : "text-ink"
        }`}
      >
        {credit ? "+ " : "− "}
        {formatEuro(Number(tx.amount), locale)}
      </span>
    </div>
  );
}

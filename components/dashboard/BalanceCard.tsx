"use client";

import { useState } from "react";
import { formatEuro, formatIban } from "@/lib/format";
import { AccountStatusBadge } from "@/components/StatusBadge";
import type { AccountStatus } from "@/lib/types";

export function BalanceCard({
  balance,
  iban,
  status,
  name,
}: {
  balance: number;
  iban: string;
  status: AccountStatus;
  name: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl2)] bg-gradient-to-br from-ink to-ink-soft p-7 text-white shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/50">Solde disponible</p>
          <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            {formatEuro(balance)}
          </p>
        </div>
        <AccountStatusBadge status={status} />
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-white/40">Titulaire</p>
          <p className="truncate text-sm font-medium">{name ?? "—"}</p>
          <p className="mt-3 text-xs text-white/40">IBAN</p>
          <p className="truncate font-mono text-sm tracking-wide text-white/90">
            {formatIban(iban)}
          </p>
        </div>
        <button
          onClick={copy}
          className="btn shrink-0 border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
        >
          {copied ? "Copié ✓" : "Copier l'IBAN"}
        </button>
      </div>

      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-2xl" />
    </div>
  );
}

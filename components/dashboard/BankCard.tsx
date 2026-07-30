"use client";

import { useState } from "react";
import { resolveCard } from "@/lib/card";
import { toggleCardFrozen } from "@/app/[lang]/dashboard/actions";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function BankCard({
  iban,
  createdAt,
  holderName,
  frozen,
  cardNumber,
  cardExp,
  cardCvv,
  cardHolder,
}: {
  iban: string;
  createdAt: string;
  holderName: string | null;
  frozen: boolean;
  cardNumber?: string | null;
  cardExp?: string | null;
  cardCvv?: string | null;
  cardHolder?: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const t = useZone("dashboard").bankCard;
  const c = useZone("common");
  const card = resolveCard(
    iban,
    createdAt,
    { number: cardNumber, exp: cardExp, cvv: cardCvv, holder: cardHolder },
    holderName,
  );

  const maskedNumber = `•••• •••• •••• ${card.last4}`;
  const numberDisplay = revealed ? card.number : maskedNumber;
  const expDisplay = revealed ? card.exp : "••/••";
  const cvvDisplay = revealed ? card.cvv : "•••";

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-[var(--radius-xl2)] p-6 text-white shadow-xl transition-all duration-300 ${
          frozen
            ? "bg-gradient-to-br from-slate-600 to-slate-800 saturate-50"
            : "bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">{c.brand}</p>
            <p className="mt-0.5 text-sm font-medium">{t.paymentCard}</p>
          </div>
          <div className="flex items-center gap-2">
            {frozen && (
              <span className="badge bg-white/15 text-white/90">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {t.frozen}
              </span>
            )}
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? t.hideInfo : t.showInfo}
              aria-pressed={revealed}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              {revealed ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Puce */}
        <div className="mt-6 h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200/90 to-yellow-400/80" />

        {/* Numéro */}
        <p className="mt-4 font-mono text-xl tracking-[0.15em] tabular-nums sm:text-2xl">
          {numberDisplay}
        </p>

        {/* Bas de carte */}
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50">{t.holder}</p>
            <p className="text-sm font-medium uppercase">{card.holder || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/50">{t.exp}</p>
            <p className="font-mono text-sm">{expDisplay}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/50">{t.cvv}</p>
            <p className="font-mono text-sm">{cvvDisplay}</p>
          </div>
        </div>

        <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Interrupteur Geler la carte */}
      <form
        action={toggleCardFrozen}
        className="mt-3 flex items-center justify-between rounded-2xl border border-black/[.06] bg-white px-4 py-3"
      >
        <div>
          <p className="text-sm font-medium text-ink">{t.freezeTitle}</p>
          <p className="text-xs text-ink/50">
            {frozen ? t.freezeDescFrozen : t.freezeDescActive}
          </p>
        </div>
        <button
          type="submit"
          role="switch"
          aria-checked={frozen}
          aria-label={t.freezeToggleAria}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            frozen ? "bg-brand-600" : "bg-black/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              frozen ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </form>
    </div>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.2A9.7 9.7 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.1 6.2A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 004-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

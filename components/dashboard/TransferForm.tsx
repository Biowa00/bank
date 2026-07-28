"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { transfer, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import { formatEuro } from "@/lib/format";
import { validateIban, cleanIban, type IbanValidation } from "@/lib/ibanValidate";
import { detectBankLocal, fetchBankFromOpenIban } from "@/lib/banks";
import { interpolate } from "@/lib/i18n/config";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export function TransferForm({ balance }: { balance: number }) {
  const [state, action] = useActionState<ActionState, FormData>(transfer, {});
  const t = useZone("dashboard").transfer;
  const E = useZone("errors").transfer;
  const locale = useLocale();

  const [iban, setIban] = useState("");
  const [ibanCheck, setIbanCheck] = useState<IbanValidation | null>(null);
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState(""); // saisissable ; pré-rempli si détecté
  const [detecting, setDetecting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Validation locale (format → longueur → mod-97) à chaque frappe, + tentative
  // de détection de banque. La détection NE FAIT QUE PRÉ-REMPLIR : elle
  // n'efface jamais une saisie manuelle du client.
  useEffect(() => {
    const clean = cleanIban(iban);
    if (!clean) {
      setIbanCheck(null);
      return;
    }
    const res = validateIban(clean);
    setIbanCheck(res);
    if (!res.valid) return;

    const local = detectBankLocal(clean);
    if (local) {
      setBankName(local.name);
      if (local.bic) setBic(local.bic);
      return;
    }
    // Sinon, tentative via API externe (best-effort, annulable, non bloquante).
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setDetecting(true);
    const timer = setTimeout(async () => {
      const remote = await fetchBankFromOpenIban(clean, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setDetecting(false);
        if (remote) {
          if (remote.name && remote.name !== "—") setBankName(remote.name);
          if (remote.bic) setBic(remote.bic);
        }
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
      setDetecting(false);
    };
  }, [iban]);

  const ibanError =
    ibanCheck && !ibanCheck.valid
      ? ibanCheck.error === "format"
        ? E.ibanFormat
        : ibanCheck.error === "length"
          ? interpolate(E.ibanLength, { expected: ibanCheck.expectedLength ?? "?" })
          : E.ibanChecksum
      : null;

  return (
    <form action={action} className="space-y-5">
      <FormFeedback state={state} />

      {/* ---- Bénéficiaire ---- */}
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="beneficiary_name">{t.beneficiaryLabel}</label>
          <input
            id="beneficiary_name"
            name="beneficiary_name"
            type="text"
            required
            maxLength={120}
            className="input"
            placeholder={t.beneficiaryPlaceholder}
          />
        </div>

        <div>
          <label className="label" htmlFor="iban">{t.ibanLabel}</label>
          <input
            id="iban"
            name="iban"
            type="text"
            required
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className={`input font-mono ${
              ibanCheck && !ibanCheck.valid
                ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                : ibanCheck?.valid
                  ? "border-accent-500/40 focus:border-accent-500 focus:ring-accent-500/10"
                  : ""
            }`}
            placeholder="DE89 3704 0044 0532 0130 00"
            autoComplete="off"
            spellCheck={false}
          />
          {ibanError && <p className="mt-1 text-xs text-red-600">{ibanError}</p>}
          {ibanCheck?.valid && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-accent-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.ibanValidLabel}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bic">{t.bicLabel}</label>
            <input
              id="bic"
              name="bic"
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value.toUpperCase())}
              className="input font-mono uppercase"
              placeholder="BNPAFRPP"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="label" htmlFor="bank_name">{t.bankLabel}</label>
            <input
              id="bank_name"
              name="bank_name"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              maxLength={80}
              className="input"
              placeholder="Ex : BNP Paribas"
              autoComplete="off"
            />
            {detecting && <p className="mt-1 text-xs text-ink/40">{t.bankDetecting}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="account_number">{t.accountLabel}</label>
          <input
            id="account_number"
            name="account_number"
            type="text"
            maxLength={34}
            className="input font-mono"
            placeholder="—"
            autoComplete="off"
          />
        </div>
      </div>

      {/* ---- Montant + devise ---- */}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="label" htmlFor="amount">{t.amountLabel}</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            className="input text-lg"
            placeholder="0,00"
          />
          <p className="mt-1 text-xs text-ink/40">{t.availableBalance} {formatEuro(balance, locale)}</p>
        </div>
        <div>
          <label className="label" htmlFor="currency">{t.currencyLabel}</label>
          <select id="currency" name="currency" defaultValue="EUR" className="input">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- Référence / motif ---- */}
      <div>
        <label className="label" htmlFor="description">{t.descriptionLabel}</label>
        <input id="description" name="description" type="text" maxLength={140} className="input" placeholder={t.descriptionPlaceholder} />
      </div>

      <SubmitButton className="btn-primary w-full py-3 text-base" pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
    </form>
  );
}

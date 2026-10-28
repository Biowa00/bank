"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { transfer, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { useZone } from "@/components/i18n/DictionaryProvider";
import { useLocale } from "@/components/i18n/navigation";
import { formatEuro } from "@/lib/format";
import { validateIban, cleanIban, type IbanValidation } from "@/lib/ibanValidate";
import { detectBankLocal, fetchBankFromOpenIban } from "@/lib/banks";
import { interpolate, intlLocale } from "@/lib/i18n/config";
import {
  ACCOUNT_COUNTRIES,
  routingTypeFor,
  validateAccountNumber,
  validateRoutingCode,
  validateBic,
  type RoutingType,
} from "@/lib/accountTransfer";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

type Method = "iban" | "account";

export function TransferForm({ balance }: { balance: number }) {
  const [state, action] = useActionState<ActionState, FormData>(transfer, {});
  const t = useZone("dashboard").transfer;
  const E = useZone("errors").transfer;
  const locale = useLocale();

  const [method, setMethod] = useState<Method>("iban");
  const [country, setCountry] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingCode, setRoutingCode] = useState("");

  // Pays du mode « numéro de compte », nommés dans la langue de l'interface.
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([intlLocale[locale]], { type: "region" });
    return Object.keys(ACCOUNT_COUNTRIES)
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, intlLocale[locale]));
  }, [locale]);

  const routingType = routingTypeFor(country);
  const routingLabels: Record<RoutingType, string> = {
    aba: t.routingAba,
    transit: t.routingTransit,
    sort_code: t.routingSortCode,
    bsb: t.routingBsb,
  };
  const routingPlaceholders: Record<RoutingType, string> = {
    aba: "021000021",
    transit: "12345-678",
    sort_code: "12-34-56",
    bsb: "123-456",
  };

  // Validation locale du mode compte (affichée dès qu'un champ est rempli).
  const accountError =
    method === "account" && country && accountNumber.trim()
      ? validateAccountNumber(country, accountNumber).error
      : undefined;
  const routingError =
    method === "account" && routingType && routingCode.trim()
      ? validateRoutingCode(routingType, routingCode).error
      : undefined;

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
    const clean = method === "iban" ? cleanIban(iban) : "";
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
  }, [iban, method]);

  const bicError =
    method === "account" && country && bic.trim() ? validateBic(country, bic).error : undefined;

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

        {/* ---- Méthode : IBAN ou numéro de compte + SWIFT ---- */}
        <div>
          <span className="label">{t.methodLabel}</span>
          <input type="hidden" name="method" value={method} />
          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-black/[.04] p-1">
            {(["iban", "account"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  method === m ? "bg-white text-ink shadow-sm" : "text-ink/60 hover:text-ink"
                }`}
              >
                {m === "iban" ? t.methodIban : t.methodAccount}
              </button>
            ))}
          </div>
        </div>

        {method === "iban" ? (
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
        ) : (
          <>
            {/* Seuls les pays hors zone IBAN sont proposés (voir lib/accountTransfer). */}
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{t.accountModeHint}</p>

            <div>
              <label className="label" htmlFor="country">{t.countryLabel}</label>
              <select
                id="country"
                name="country"
                required
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setRoutingCode("");
                }}
                className="input"
              >
                <option value="" disabled>{t.countryPlaceholder}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="account_number">
                {country === "MX" ? t.clabeLabel : t.accountLabel}
              </label>
              <input
                id="account_number"
                name="account_number"
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={40}
                className={`input font-mono ${accountError ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
                placeholder={country === "MX" ? "002010077777777771" : "—"}
                autoComplete="off"
                spellCheck={false}
              />
              {accountError && <p className="mt-1 text-xs text-red-600">{E[accountError]}</p>}
            </div>

            {routingType && (
              <div>
                <label className="label" htmlFor="routing_code">{routingLabels[routingType]}</label>
                <input
                  id="routing_code"
                  name="routing_code"
                  type="text"
                  inputMode="numeric"
                  required
                  value={routingCode}
                  onChange={(e) => setRoutingCode(e.target.value)}
                  maxLength={12}
                  className={`input font-mono ${routingError ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
                  placeholder={routingPlaceholders[routingType]}
                  autoComplete="off"
                  spellCheck={false}
                />
                {routingError && <p className="mt-1 text-xs text-red-600">{E[routingError]}</p>}
              </div>
            )}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bic">{t.bicLabel}</label>
            <input
              id="bic"
              name="bic"
              type="text"
              required={method === "account"}
              value={bic}
              onChange={(e) => setBic(e.target.value.toUpperCase())}
              className={`input font-mono uppercase ${bicError ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
              placeholder={method === "account" ? "CHASUS33" : "BNPAFRPP"}
              autoComplete="off"
              spellCheck={false}
            />
            {bicError && <p className="mt-1 text-xs text-red-600">{E[bicError]}</p>}
          </div>
          <div>
            <label className="label" htmlFor="bank_name">{t.bankLabel}</label>
            <input
              id="bank_name"
              name="bank_name"
              type="text"
              required={method === "account"}
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

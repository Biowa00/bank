/**
 * Virement par NUMÉRO DE COMPTE + SWIFT/BIC, pour les banques hors zone IBAN.
 * Utilisable côté client (formulaire) comme serveur (action).
 *
 * Seule une sélection de pays est acceptée (Amériques hors zone IBAN,
 * Royaume-Uni, Australie). Les pays de la zone IBAN doivent passer par l'IBAN.
 * Comme pour le mod-97, les clés de contrôle (ABA, CLABE) garantissent la
 * COHÉRENCE des numéros, pas l'existence réelle du compte.
 */

/** Code bancaire national exigé en plus du SWIFT selon le pays. */
export type RoutingType = "aba" | "transit" | "sort_code" | "bsb";

/** Pays acceptés en mode « numéro de compte » → code national éventuel. */
export const ACCOUNT_COUNTRIES: Record<string, RoutingType | null> = {
  US: "aba",
  CA: "transit",
  GB: "sort_code",
  AU: "bsb",
  MX: null, // le numéro de compte est la CLABE (18 chiffres)
  AR: null, BB: null, BO: null, BS: null, BZ: null, CL: null, CO: null,
  EC: null, GY: null, HN: null, HT: null, JM: null, NI: null, PA: null,
  PE: null, PY: null, SR: null, TT: null, UY: null, VE: null,
};

export function isAccountCountry(country: string): boolean {
  return Object.prototype.hasOwnProperty.call(ACCOUNT_COUNTRIES, country);
}

export function routingTypeFor(country: string): RoutingType | null {
  return isAccountCountry(country) ? ACCOUNT_COUNTRIES[country] : null;
}

export type AccountErrorCode =
  | "countryUnsupported"
  | "accountFormat"
  | "accountIsIban"
  | "clabeChecksum"
  | "routingFormat"
  | "routingChecksum"
  | "bicFormat"
  | "bicCountry";

/** Supprime espaces/tirets/points, met en majuscules. */
function compact(raw: string): string {
  return raw.replace(/[\s.\-/]+/g, "").toUpperCase();
}

/** Clé ABA (US) : 3·(d1+d4+d7) + 7·(d2+d5+d8) + (d3+d6+d9) ≡ 0 mod 10. */
function abaChecksumOk(d: string): boolean {
  const n = d.split("").map(Number);
  const sum =
    3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8]);
  return sum % 10 === 0;
}

/** Clé CLABE (MX) : pondération 3-7-1 sur les 17 premiers chiffres. */
function clabeChecksumOk(d: string): boolean {
  const w = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += ((Number(d[i]) * w[i % 3]) % 10);
  return (10 - (sum % 10)) % 10 === Number(d[17]);
}

/** Détecte un IBAN saisi par erreur dans le champ « numéro de compte ». */
function looksLikeIban(v: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v);
}

/** Valide le numéro de compte selon le pays. Renvoie la valeur normalisée. */
export function validateAccountNumber(
  country: string,
  raw: string,
): { value: string; error?: AccountErrorCode } {
  const v = compact(raw);
  if (looksLikeIban(v)) return { value: v, error: "accountIsIban" };
  switch (country) {
    case "MX":
      if (!/^\d{18}$/.test(v)) return { value: v, error: "accountFormat" };
      return clabeChecksumOk(v) ? { value: v } : { value: v, error: "clabeChecksum" };
    case "US":
      return /^\d{4,17}$/.test(v) ? { value: v } : { value: v, error: "accountFormat" };
    case "CA":
      return /^\d{5,12}$/.test(v) ? { value: v } : { value: v, error: "accountFormat" };
    case "GB":
      return /^\d{6,8}$/.test(v) ? { value: v } : { value: v, error: "accountFormat" };
    case "AU":
      return /^\d{5,10}$/.test(v) ? { value: v } : { value: v, error: "accountFormat" };
    default:
      return /^[A-Z0-9]{4,34}$/.test(v) ? { value: v } : { value: v, error: "accountFormat" };
  }
}

/** Valide le code national (ABA, transit, sort code, BSB) et le normalise. */
export function validateRoutingCode(
  type: RoutingType,
  raw: string,
): { value: string; error?: AccountErrorCode } {
  const d = raw.replace(/\D+/g, "");
  switch (type) {
    case "aba":
      if (d.length !== 9) return { value: d, error: "routingFormat" };
      return abaChecksumOk(d) ? { value: d } : { value: d, error: "routingChecksum" };
    case "transit": // 5 chiffres de transit + 3 chiffres d'institution
      return d.length === 8
        ? { value: `${d.slice(0, 5)}-${d.slice(5)}` }
        : { value: d, error: "routingFormat" };
    case "sort_code":
      return d.length === 6
        ? { value: `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}` }
        : { value: d, error: "routingFormat" };
    case "bsb":
      return d.length === 6
        ? { value: `${d.slice(0, 3)}-${d.slice(3)}` }
        : { value: d, error: "routingFormat" };
  }
}

/** Valide un SWIFT/BIC (8 ou 11 caractères) et sa cohérence avec le pays. */
export function validateBic(
  country: string,
  raw: string,
): { value: string; error?: AccountErrorCode } {
  const v = compact(raw);
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v))
    return { value: v, error: "bicFormat" };
  if (v.slice(4, 6) !== country) return { value: v, error: "bicCountry" };
  return { value: v };
}

export type AccountDestination = {
  country: string;
  accountNumber: string;
  routingType: RoutingType | null;
  routingCode: string | null;
  bic: string;
};

/** Validation complète (serveur) : pays → compte → code national → BIC. */
export function validateAccountDestination(input: {
  country: string;
  accountNumber: string;
  routingCode: string;
  bic: string;
}): { ok: true; data: AccountDestination } | { ok: false; error: AccountErrorCode } {
  const country = input.country.trim().toUpperCase();
  if (!isAccountCountry(country)) return { ok: false, error: "countryUnsupported" };

  const acc = validateAccountNumber(country, input.accountNumber);
  if (acc.error) return { ok: false, error: acc.error };

  const routingType = routingTypeFor(country);
  let routingCode: string | null = null;
  if (routingType) {
    const r = validateRoutingCode(routingType, input.routingCode);
    if (r.error) return { ok: false, error: r.error };
    routingCode = r.value;
  }

  const bic = validateBic(country, input.bic);
  if (bic.error) return { ok: false, error: bic.error };

  return {
    ok: true,
    data: { country, accountNumber: acc.value, routingType, routingCode, bic: bic.value },
  };
}

/** Libellé court d'un compte hors IBAN : « •••1234 · CHASUS33 ». */
export function formatAccountDestination(accountNumber: string, bic?: string | null): string {
  const masked = accountNumber.length > 4 ? `•••${accountNumber.slice(-4)}` : accountNumber;
  return bic ? `${masked} · ${bic}` : masked;
}

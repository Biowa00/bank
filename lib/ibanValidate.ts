/**
 * Validation d'IBAN : format, longueur par pays, et clé de contrôle mod-97
 * (norme ISO 7064). Utilisable côté client (formulaire) comme serveur (action).
 *
 * IMPORTANT : le mod-97 garantit seulement la COHÉRENCE du numéro (pas de faute
 * de frappe), PAS l'existence réelle du compte bancaire.
 */

/** Longueur totale d'un IBAN par code pays (ISO 13616). */
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28,
  EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27,
  JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21,
  MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15,
  PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24,
  SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export type IbanErrorCode = "format" | "length" | "checksum";

export type IbanValidation = {
  valid: boolean;
  /** Type d'erreur si invalide, pour un message précis dans l'UI. */
  error?: IbanErrorCode;
  /** Code pays (2 lettres) si le format de base est reconnu. */
  country?: string;
  /** Longueur attendue pour ce pays (si connu). */
  expectedLength?: number;
};

/** Nettoie un IBAN saisi : supprime espaces/tirets, met en majuscules. */
export function cleanIban(iban: string): string {
  return iban.replace(/[\s-]+/g, "").toUpperCase();
}

/** Calcule le reste mod 97 d'un IBAN déjà nettoyé (ISO 7064). */
function mod97(iban: string): number {
  // 1. Les 4 premiers caractères (pays + clé) passent à la fin.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  // 2. Chaque lettre → nombre (A=10 … Z=35), concaténé en chaîne de chiffres.
  let expanded = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) expanded += (code - 55).toString(); // A-Z
    else expanded += ch; // 0-9
  }
  // 3. Modulo 97 calculé progressivement (évite les grands entiers).
  let remainder = 0;
  for (let i = 0; i < expanded.length; i++) {
    remainder = (remainder * 10 + (expanded.charCodeAt(i) - 48)) % 97;
  }
  return remainder;
}

/**
 * Valide un IBAN et renvoie le détail : format → longueur → clé de contrôle.
 * L'ordre des contrôles permet d'afficher l'erreur la plus pertinente.
 */
export function validateIban(raw: string): IbanValidation {
  const iban = cleanIban(raw);

  // 1. Format de base : 2 lettres (pays) + 2 chiffres (clé) + alphanumérique.
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) {
    return { valid: false, error: "format" };
  }
  const country = iban.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];

  // 2. Longueur attendue pour le pays (si le pays est connu).
  if (expectedLength && iban.length !== expectedLength) {
    return { valid: false, error: "length", country, expectedLength };
  }

  // 3. Clé de contrôle mod-97 : valide uniquement si le reste vaut 1.
  if (mod97(iban) !== 1) {
    return { valid: false, error: "checksum", country, expectedLength };
  }

  return { valid: true, country, expectedLength };
}

/** Raccourci booléen (compat) : true si l'IBAN est structurellement valide. */
export function isValidIban(raw: string): boolean {
  return validateIban(raw).valid;
}

/**
 * Calcule les 2 chiffres de clé de contrôle d'un IBAN (ISO 7064) pour un pays
 * et un BBAN donnés. Utilisé pour générer des IBAN simulés qui satisfont
 * réellement le mod-97 (donc acceptés par la validation des virements internes).
 */
export function computeCheckDigits(country: string, bban: string): string {
  const s = bban + country + "00";
  let expanded = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    expanded += code >= 65 && code <= 90 ? (code - 55).toString() : ch;
  }
  let remainder = 0;
  for (let i = 0; i < expanded.length; i++) {
    remainder = (remainder * 10 + (expanded.charCodeAt(i) - 48)) % 97;
  }
  return (98 - remainder).toString().padStart(2, "0");
}

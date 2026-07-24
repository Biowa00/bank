/**
 * Détection de la banque à partir d'un IBAN : extrait le code banque selon la
 * position propre au pays, puis le compare à une table locale des banques
 * connues (affichage instantané, sans réseau). Si le code est absent de la
 * table, {@link fetchBankFromOpenIban} peut compléter via une API externe.
 */
import { cleanIban } from "@/lib/ibanValidate";

/**
 * Position du code banque dans le BBAN (après les 4 premiers caractères
 * pays+clé) et sa longueur, par pays. Ex. FR : 5 chiffres à partir de l'index
 * 4 ; DE : 8 chiffres (Bankleitzahl) à partir de l'index 4.
 */
const BANK_CODE_SPEC: Record<string, { start: number; length: number }> = {
  FR: { start: 4, length: 5 },
  DE: { start: 4, length: 8 },
  ES: { start: 4, length: 4 },
  IT: { start: 5, length: 5 }, // IT : 1 lettre CIN puis 5 chiffres ABI
  BE: { start: 4, length: 3 },
  NL: { start: 4, length: 4 }, // NL : code banque = 4 lettres
  CH: { start: 4, length: 5 },
  GB: { start: 4, length: 4 }, // GB : 4 lettres (bank identifier)
  PT: { start: 4, length: 4 },
  AT: { start: 4, length: 5 },
  LU: { start: 4, length: 3 },
};

/** Extrait le code pays et le code banque d'un IBAN, si le pays est géré. */
export function extractBankCode(
  raw: string,
): { country: string; bankCode: string } | null {
  const iban = cleanIban(raw);
  const country = iban.slice(0, 2);
  const spec = BANK_CODE_SPEC[country];
  if (!spec) return null;
  const bankCode = iban.slice(spec.start, spec.start + spec.length);
  if (bankCode.length < spec.length) return null;
  return { country, bankCode };
}

export type BankInfo = { name: string; bic?: string };

/**
 * Table locale des principales banques (code banque → nom + BIC). Volontairement
 * partielle : sert l'affichage instantané des banques les plus courantes ;
 * l'API externe complète le reste.
 */
const KNOWN_BANKS: Record<string, Record<string, BankInfo>> = {
  FR: {
    "30004": { name: "BNP Paribas", bic: "BNPAFRPP" },
    "30003": { name: "Société Générale", bic: "SOGEFRPP" },
    "30002": { name: "Crédit Lyonnais (LCL)", bic: "CRLYFRPP" },
    "30006": { name: "Crédit Agricole", bic: "AGRIFRPP" },
    "20041": { name: "La Banque Postale", bic: "PSSTFRPP" },
    "10278": { name: "Crédit Mutuel", bic: "CMCIFR2A" },
    "10907": { name: "Banque Populaire", bic: "CCBPFRPP" },
    "16798": { name: "Caisse d'Épargne", bic: "CEPAFRPP" },
    "18306": { name: "Boursorama / BoursoBank", bic: "BOUSFRPP" },
    "16958": { name: "Fortuneo", bic: "FTNOFRP1" },
  },
  DE: {
    "37040044": { name: "Commerzbank", bic: "COBADEFFXXX" },
    "10000000": { name: "Bundesbank", bic: "MARKDEF1100" },
    "10070000": { name: "Deutsche Bank", bic: "DEUTDEBBXXX" },
    "10050000": { name: "Berliner Sparkasse", bic: "BELADEBEXXX" },
    "50010517": { name: "ING-DiBa", bic: "INGDDEFFXXX" },
    "70022200": { name: "Fidor / N26 (Weltsparen)", bic: "FDDODEMMXXX" },
    "12030000": { name: "DKB", bic: "BYLADEM1001" },
    "20041133": { name: "Comdirect", bic: "COBADEHD044" },
  },
  ES: {
    "0049": { name: "Banco Santander", bic: "BSCHESMMXXX" },
    "0075": { name: "Banco Popular", bic: "POPUESMMXXX" },
    "2100": { name: "CaixaBank", bic: "CAIXESBBXXX" },
    "0182": { name: "BBVA", bic: "BBVAESMMXXX" },
    "0081": { name: "Banco Sabadell", bic: "BSABESBBXXX" },
  },
  GB: {
    BARC: { name: "Barclays", bic: "BARCGB22" },
    LOYD: { name: "Lloyds Bank", bic: "LOYDGB2L" },
    HBUK: { name: "HSBC UK", bic: "HBUKGB4B" },
    NWBK: { name: "NatWest", bic: "NWBKGB2L" },
    REVO: { name: "Revolut", bic: "REVOGB21" },
  },
};

/** Cherche la banque dans la table locale (instantané, sans réseau). */
export function detectBankLocal(raw: string): BankInfo | null {
  const extracted = extractBankCode(raw);
  if (!extracted) return null;
  return KNOWN_BANKS[extracted.country]?.[extracted.bankCode] ?? null;
}

/**
 * Complète via l'API publique openiban.com quand la table locale ne connaît pas
 * le code banque. Best-effort : renvoie null en cas d'échec réseau/CORS, sans
 * jamais bloquer le formulaire. À appeler uniquement côté client.
 */
export async function fetchBankFromOpenIban(
  raw: string,
  signal?: AbortSignal,
): Promise<BankInfo | null> {
  const iban = cleanIban(raw);
  try {
    const res = await fetch(
      `https://openiban.com/validate/${iban}?getBIC=true&validateBankCode=true`,
      { signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      valid?: boolean;
      bankData?: { name?: string; bic?: string };
    };
    const name = data.bankData?.name?.trim();
    const bic = data.bankData?.bic?.trim();
    if (!name && !bic) return null;
    return { name: name || "—", bic: bic || undefined };
  } catch {
    return null; // réseau indisponible / CORS / requête annulée
  }
}

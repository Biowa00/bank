/**
 * Format national indicatif par pays (indicatif → découpage des chiffres).
 * `groups` = tailles successives des blocs ; leur somme = nombre de chiffres attendu.
 */
export type PhoneFormat = {
  code: string;
  label: string;
  groups: number[];
};

export const phoneFormats: PhoneFormat[] = [
  { code: "+33", label: "France (+33)", groups: [1, 2, 2, 2, 2] }, //  6 12 34 56 78
  { code: "+32", label: "Belgique (+32)", groups: [3, 2, 2, 2] }, // 470 12 34 56
  { code: "+41", label: "Suisse (+41)", groups: [2, 3, 2, 2] }, // 79 123 45 67
  { code: "+352", label: "Luxembourg (+352)", groups: [3, 3, 3] }, // 621 234 567
  { code: "+1", label: "Canada / USA (+1)", groups: [3, 3, 4] }, // 234 567 8901
  { code: "+34", label: "Espagne (+34)", groups: [3, 3, 3] }, // 612 345 678
  { code: "+39", label: "Italie (+39)", groups: [3, 3, 4] }, // 312 345 6789
  { code: "+49", label: "Allemagne (+49)", groups: [3, 4, 4] }, // 151 2345 6789
  { code: "+212", label: "Maroc (+212)", groups: [1, 2, 2, 2, 2] }, // 6 12 34 56 78
  { code: "+213", label: "Algérie (+213)", groups: [3, 2, 2, 2] }, // 551 23 45 67
  { code: "+216", label: "Tunisie (+216)", groups: [2, 3, 3] }, // 20 123 456
  { code: "+225", label: "Côte d'Ivoire (+225)", groups: [2, 2, 2, 2, 2] }, // 07 12 34 56 78
  { code: "+221", label: "Sénégal (+221)", groups: [2, 3, 2, 2] }, // 77 123 45 67
  { code: "+44", label: "Royaume-Uni (+44)", groups: [4, 6] }, // 7123 456789
];

const byCode = new Map(phoneFormats.map((f) => [f.code, f]));

export function getPhoneFormat(code: string): PhoneFormat {
  return byCode.get(code) ?? { code, label: code, groups: [2, 2, 2, 2, 2] };
}

/** Nombre total de chiffres attendu pour un pays. */
export function phoneMaxDigits(code: string): number {
  return getPhoneFormat(code).groups.reduce((a, b) => a + b, 0);
}

/** Formate une saisie brute selon le découpage du pays (espaces entre blocs). */
export function formatPhone(raw: string, code: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, phoneMaxDigits(code));
  const groups = getPhoneFormat(code).groups;
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + g));
    i += g;
  }
  return out.join(" ");
}

/** Placeholder illustratif (des « 0 ») au format du pays. */
export function phonePlaceholder(code: string): string {
  return getPhoneFormat(code)
    .groups.map((g) => "0".repeat(g))
    .join(" ");
}

/** true si la saisie contient exactement le nombre de chiffres attendu. */
export function isPhoneComplete(raw: string, code: string): boolean {
  return raw.replace(/\D/g, "").length === phoneMaxDigits(code);
}

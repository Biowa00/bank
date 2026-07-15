/**
 * Format national indicatif par pays (indicatif → découpage des chiffres).
 * `groups` = tailles successives des blocs ; leur somme = nombre de chiffres attendu.
 */
export type PhoneFormat = {
  code: string;
  label: string;
  groups: number[];
};

/**
 * Uniquement les pays dont la langue de l'interface est disponible (les 13
 * langues supportées). Libellés en nom local (endonyme) + indicatif, donc
 * neutres vis-à-vis de la langue affichée.
 */
export const phoneFormats: PhoneFormat[] = [
  // Français
  { code: "+33", label: "France (+33)", groups: [1, 2, 2, 2, 2] },
  { code: "+32", label: "Belgique (+32)", groups: [3, 2, 2, 2] },
  { code: "+352", label: "Luxembourg (+352)", groups: [3, 3, 3] },
  { code: "+377", label: "Monaco (+377)", groups: [2, 2, 2, 2] },
  // Allemand
  { code: "+49", label: "Deutschland (+49)", groups: [3, 4, 4] },
  { code: "+43", label: "Österreich (+43)", groups: [3, 3, 4] },
  { code: "+41", label: "Schweiz (+41)", groups: [2, 3, 2, 2] },
  { code: "+423", label: "Liechtenstein (+423)", groups: [3, 2, 2] },
  // Anglais
  { code: "+44", label: "United Kingdom (+44)", groups: [4, 6] },
  { code: "+353", label: "Ireland (+353)", groups: [2, 3, 4] },
  // Espagnol
  { code: "+34", label: "España (+34)", groups: [3, 3, 3] },
  // Italien
  { code: "+39", label: "Italia (+39)", groups: [3, 3, 4] },
  // Portugais
  { code: "+351", label: "Portugal (+351)", groups: [3, 3, 3] },
  // Polonais
  { code: "+48", label: "Polska (+48)", groups: [3, 3, 3] },
  // Tchèque
  { code: "+420", label: "Česko (+420)", groups: [3, 3, 3] },
  // Slovaque
  { code: "+421", label: "Slovensko (+421)", groups: [3, 3, 3] },
  // Slovène
  { code: "+386", label: "Slovenija (+386)", groups: [2, 3, 3] },
  // Hongrois
  { code: "+36", label: "Magyarország (+36)", groups: [2, 3, 4] },
  // Bulgare
  { code: "+359", label: "България (+359)", groups: [3, 3, 3] },
  // Grec
  { code: "+30", label: "Ελλάδα (+30)", groups: [3, 3, 4] },
  { code: "+357", label: "Κύπρος (+357)", groups: [2, 3, 3] },
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

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
  { code: "+33", label: "+33 France", groups: [1, 2, 2, 2, 2] },
  { code: "+32", label: "+32 Belgique", groups: [3, 2, 2, 2] },
  { code: "+352", label: "+352 Luxembourg", groups: [3, 3, 3] },
  { code: "+377", label: "+377 Monaco", groups: [2, 2, 2, 2] },
  // Allemand
  { code: "+49", label: "+49 Deutschland", groups: [3, 4, 4] },
  { code: "+43", label: "+43 Österreich", groups: [3, 3, 4] },
  { code: "+41", label: "+41 Schweiz", groups: [2, 3, 2, 2] },
  { code: "+423", label: "+423 Liechtenstein", groups: [3, 2, 2] },
  // Anglais
  { code: "+44", label: "+44 United Kingdom", groups: [4, 6] },
  { code: "+353", label: "+353 Ireland", groups: [2, 3, 4] },
  // Espagnol
  { code: "+34", label: "+34 España", groups: [3, 3, 3] },
  // Italien
  { code: "+39", label: "+39 Italia", groups: [3, 3, 4] },
  // Portugais
  { code: "+351", label: "+351 Portugal", groups: [3, 3, 3] },
  // Polonais
  { code: "+48", label: "+48 Polska", groups: [3, 3, 3] },
  // Tchèque
  { code: "+420", label: "+420 Česko", groups: [3, 3, 3] },
  // Slovaque
  { code: "+421", label: "+421 Slovensko", groups: [3, 3, 3] },
  // Slovène
  { code: "+386", label: "+386 Slovenija", groups: [2, 3, 3] },
  // Hongrois
  { code: "+36", label: "+36 Magyarország", groups: [2, 3, 4] },
  // Bulgare
  { code: "+359", label: "+359 България", groups: [3, 3, 3] },
  // Grec
  { code: "+30", label: "+30 Ελλάδα", groups: [3, 3, 4] },
  { code: "+357", label: "+357 Κύπρος", groups: [2, 3, 3] },
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

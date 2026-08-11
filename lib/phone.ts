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
 * Liste étendue d'indicatifs téléphoniques (zone euro, Union européenne,
 * Europe élargie, Amérique du Nord, Maghreb / Afrique, Moyen-Orient, Asie,
 * Amérique latine, Océanie). Libellés = indicatif + nom du pays. Les `groups`
 * donnent un découpage indicatif du numéro national (approximatif : appli
 * pédagogique). Plusieurs pays peuvent partager un indicatif (+1, +7).
 */
export const phoneFormats: PhoneFormat[] = [
  // ---------- Zone euro ----------
  { code: "+33", label: "+33 France", groups: [1, 2, 2, 2, 2] },
  { code: "+49", label: "+49 Deutschland", groups: [3, 4, 4] },
  { code: "+39", label: "+39 Italia", groups: [3, 3, 4] },
  { code: "+34", label: "+34 España", groups: [3, 3, 3] },
  { code: "+31", label: "+31 Nederland", groups: [1, 4, 4] },
  { code: "+32", label: "+32 België / Belgique", groups: [3, 2, 2, 2] },
  { code: "+351", label: "+351 Portugal", groups: [3, 3, 3] },
  { code: "+43", label: "+43 Österreich", groups: [3, 3, 4] },
  { code: "+353", label: "+353 Éire / Ireland", groups: [2, 3, 4] },
  { code: "+358", label: "+358 Suomi", groups: [2, 3, 4] },
  { code: "+30", label: "+30 Ελλάδα", groups: [3, 3, 4] },
  { code: "+352", label: "+352 Luxembourg", groups: [3, 3, 3] },
  { code: "+386", label: "+386 Slovenija", groups: [2, 3, 3] },
  { code: "+421", label: "+421 Slovensko", groups: [3, 3, 3] },
  { code: "+372", label: "+372 Eesti", groups: [4, 4] },
  { code: "+371", label: "+371 Latvija", groups: [4, 4] },
  { code: "+370", label: "+370 Lietuva", groups: [3, 5] },
  { code: "+357", label: "+357 Κύπρος", groups: [2, 3, 3] },
  { code: "+356", label: "+356 Malta", groups: [4, 4] },
  { code: "+377", label: "+377 Monaco", groups: [2, 2, 2, 2] },
  { code: "+378", label: "+378 San Marino", groups: [3, 3, 4] },
  // ---------- Union européenne (hors euro) ----------
  { code: "+48", label: "+48 Polska", groups: [3, 3, 3] },
  { code: "+420", label: "+420 Česko", groups: [3, 3, 3] },
  { code: "+36", label: "+36 Magyarország", groups: [2, 3, 4] },
  { code: "+40", label: "+40 România", groups: [3, 3, 3] },
  { code: "+359", label: "+359 България", groups: [3, 3, 3] },
  { code: "+385", label: "+385 Hrvatska", groups: [2, 3, 4] },
  { code: "+45", label: "+45 Danmark", groups: [2, 2, 2, 2] },
  { code: "+46", label: "+46 Sverige", groups: [2, 3, 4] },
  // ---------- Europe élargie ----------
  { code: "+44", label: "+44 United Kingdom", groups: [4, 6] },
  { code: "+41", label: "+41 Schweiz / Suisse", groups: [2, 3, 2, 2] },
  { code: "+47", label: "+47 Norge", groups: [3, 2, 3] },
  { code: "+354", label: "+354 Ísland", groups: [3, 4] },
  { code: "+423", label: "+423 Liechtenstein", groups: [3, 2, 2] },
  { code: "+376", label: "+376 Andorra", groups: [3, 3] },
  { code: "+381", label: "+381 Srbija", groups: [2, 3, 4] },
  { code: "+382", label: "+382 Crna Gora", groups: [2, 3, 3] },
  { code: "+387", label: "+387 Bosna i Hercegovina", groups: [2, 3, 3] },
  { code: "+389", label: "+389 Severna Makedonija", groups: [2, 3, 3] },
  { code: "+355", label: "+355 Shqipëri", groups: [3, 3, 3] },
  { code: "+383", label: "+383 Kosovë", groups: [2, 3, 3] },
  { code: "+380", label: "+380 Україна", groups: [2, 3, 4] },
  { code: "+375", label: "+375 Беларусь", groups: [2, 3, 4] },
  { code: "+373", label: "+373 Moldova", groups: [3, 5] },
  { code: "+7", label: "+7 Россия", groups: [3, 3, 2, 2] },
  { code: "+90", label: "+90 Türkiye", groups: [3, 3, 2, 2] },
  { code: "+995", label: "+995 საქართველო", groups: [3, 3, 3] },
  { code: "+374", label: "+374 Հայաստան", groups: [2, 3, 3] },
  { code: "+994", label: "+994 Azərbaycan", groups: [2, 3, 2, 2] },
  // ---------- Amérique du Nord ----------
  { code: "+1", label: "+1 United States", groups: [3, 3, 4] },
  { code: "+1", label: "+1 Canada", groups: [3, 3, 4] },
  { code: "+52", label: "+52 México", groups: [3, 3, 4] },
  // ---------- Maghreb / Afrique ----------
  { code: "+212", label: "+212 Maroc", groups: [3, 3, 3] },
  { code: "+213", label: "+213 Algérie", groups: [3, 2, 2, 2] },
  { code: "+216", label: "+216 Tunisie", groups: [2, 3, 3] },
  { code: "+218", label: "+218 Libya", groups: [2, 3, 4] },
  { code: "+20", label: "+20 مصر", groups: [3, 3, 4] },
  { code: "+234", label: "+234 Nigeria", groups: [3, 3, 4] },
  { code: "+225", label: "+225 Côte d'Ivoire", groups: [2, 2, 2, 2, 2] },
  { code: "+221", label: "+221 Sénégal", groups: [2, 3, 2, 2] },
  { code: "+237", label: "+237 Cameroun", groups: [1, 4, 4] },
  { code: "+233", label: "+233 Ghana", groups: [2, 3, 4] },
  { code: "+254", label: "+254 Kenya", groups: [3, 3, 3] },
  { code: "+27", label: "+27 South Africa", groups: [2, 3, 4] },
  { code: "+228", label: "+228 Togo", groups: [2, 2, 2, 2] },
  { code: "+229", label: "+229 Bénin", groups: [2, 2, 2, 2] },
  { code: "+226", label: "+226 Burkina Faso", groups: [2, 2, 2, 2] },
  { code: "+223", label: "+223 Mali", groups: [2, 2, 2, 2] },
  { code: "+243", label: "+243 RD Congo", groups: [3, 3, 3] },
  // ---------- Moyen-Orient ----------
  { code: "+971", label: "+971 الإمارات", groups: [2, 3, 4] },
  { code: "+966", label: "+966 السعودية", groups: [2, 3, 4] },
  { code: "+974", label: "+974 قطر", groups: [4, 4] },
  { code: "+965", label: "+965 الكويت", groups: [4, 4] },
  { code: "+973", label: "+973 البحرين", groups: [4, 4] },
  { code: "+968", label: "+968 عُمان", groups: [4, 4] },
  { code: "+962", label: "+962 الأردن", groups: [1, 4, 4] },
  { code: "+961", label: "+961 لبنان", groups: [2, 3, 3] },
  { code: "+972", label: "+972 ישראל", groups: [2, 3, 4] },
  { code: "+98", label: "+98 ایران", groups: [3, 3, 4] },
  { code: "+964", label: "+964 العراق", groups: [3, 3, 4] },
  // ---------- Asie ----------
  { code: "+91", label: "+91 India", groups: [5, 5] },
  { code: "+86", label: "+86 中国", groups: [3, 4, 4] },
  { code: "+81", label: "+81 日本", groups: [2, 4, 4] },
  { code: "+82", label: "+82 대한민국", groups: [2, 4, 4] },
  { code: "+62", label: "+62 Indonesia", groups: [3, 4, 3] },
  { code: "+63", label: "+63 Philippines", groups: [3, 3, 4] },
  { code: "+66", label: "+66 ไทย", groups: [1, 4, 4] },
  { code: "+84", label: "+84 Việt Nam", groups: [2, 3, 4] },
  { code: "+65", label: "+65 Singapore", groups: [4, 4] },
  { code: "+60", label: "+60 Malaysia", groups: [2, 3, 4] },
  { code: "+92", label: "+92 پاکستان", groups: [3, 3, 4] },
  { code: "+880", label: "+880 বাংলাদেশ", groups: [4, 6] },
  // ---------- Amérique latine ----------
  { code: "+55", label: "+55 Brasil", groups: [2, 5, 4] },
  { code: "+54", label: "+54 Argentina", groups: [2, 4, 4] },
  { code: "+56", label: "+56 Chile", groups: [1, 4, 4] },
  { code: "+57", label: "+57 Colombia", groups: [3, 3, 4] },
  { code: "+51", label: "+51 Perú", groups: [3, 3, 3] },
  { code: "+58", label: "+58 Venezuela", groups: [3, 3, 4] },
  { code: "+593", label: "+593 Ecuador", groups: [2, 3, 4] },
  { code: "+598", label: "+598 Uruguay", groups: [1, 3, 4] },
  { code: "+595", label: "+595 Paraguay", groups: [3, 3, 3] },
  // ---------- Océanie ----------
  { code: "+61", label: "+61 Australia", groups: [3, 3, 3] },
  { code: "+64", label: "+64 New Zealand", groups: [2, 3, 4] },
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

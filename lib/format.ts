import { defaultLocale, intlLocale, type Locale } from "@/lib/i18n/config";

/** Formate un montant en euros dans la locale donnée (défaut : fr). */
export function formatEuro(amount: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Regroupe un IBAN par blocs de 4 pour l'affichage. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** Nettoie un IBAN saisi (supprime espaces, met en majuscules). */
export function cleanIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/** Valide grossièrement le format d'un IBAN (FR + longueur). */
export function isPlausibleIban(iban: string): boolean {
  const clean = cleanIban(iban);
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(clean);
}

/** Date + heure lisibles dans la locale donnée. */
export function formatDate(iso: string, locale: Locale = defaultLocale): string {
  return new Date(iso).toLocaleString(intlLocale[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string, locale: Locale = defaultLocale): string {
  return new Date(iso).toLocaleDateString(intlLocale[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

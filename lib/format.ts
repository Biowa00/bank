/** Formate un montant en euros. */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
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

/** Date lisible en français. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

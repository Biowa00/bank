/**
 * Génère de façon déterministe les informations d'affichage d'une carte
 * à partir de l'IBAN et de la date de création (aucun secret stocké).
 */
export function deriveCard(iban: string, createdAt: string) {
  const digits = iban.replace(/\D/g, "");
  const body = (digits + digits).slice(0, 12).padEnd(12, "0");
  const raw = "4539" + body; // 16 chiffres
  const number = raw.replace(/(.{4})/g, "$1 ").trim();
  const last4 = raw.slice(-4);

  const d = new Date(createdAt);
  const exp = `${String((d.getMonth() % 12) + 1).padStart(2, "0")}/${String(
    (d.getFullYear() + 4) % 100,
  ).padStart(2, "0")}`;

  let h = 0;
  for (const c of iban) h = (h * 31 + c.charCodeAt(0)) % 1000;
  const cvv = String(h).padStart(3, "0");

  return { number, last4, exp, cvv };
}

import { computeCheckDigits } from "@/lib/ibanValidate";

/**
 * Génère un IBAN allemand SIMULÉ mais VALIDE au sens mod-97 (ISO 7064) :
 * `DE` + 2 chiffres de clé calculés + 18 chiffres de BBAN = 22 caractères
 * (longueur d'un IBAN allemand réel). La clé étant correcte, ces IBAN sont
 * acceptés par la validation des virements internes entre comptes Vantex.
 * Non routable pour autant : ce n'est pas un vrai compte bancaire.
 */
export function generateFakeIban(): string {
  let bban = "";
  for (let i = 0; i < 18; i++) {
    bban += Math.floor(Math.random() * 10).toString();
  }
  const check = computeCheckDigits("DE", bban);
  return `DE${check}${bban}`;
}

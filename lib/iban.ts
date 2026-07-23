/**
 * Génère un IBAN allemand SIMULÉ (format valide en longueur, NON routable) :
 * `DE` + 20 chiffres = 22 caractères, qui est exactement la longueur d'un IBAN
 * allemand réel. Utilisé pour attribuer un IBAN au compte client à
 * l'inscription. Aucune garantie de clé de contrôle : ce n'est pas un vrai
 * compte bancaire, uniquement un identifiant d'affichage cohérent.
 */
export function generateFakeIban(): string {
  let digits = "";
  for (let i = 0; i < 20; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return `DE${digits}`;
}

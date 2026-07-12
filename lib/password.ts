/** Règles de validation du mot de passe, partagées client + serveur. */
export type PasswordRule = { label: string; test: (pwd: string) => boolean };

export const passwordRules: PasswordRule[] = [
  { label: "Au moins 8 caractères", test: (p) => p.length >= 8 },
  { label: "Une lettre majuscule", test: (p) => /[A-Z]/.test(p) },
  { label: "Un chiffre", test: (p) => /[0-9]/.test(p) },
];

/** Renvoie l'état de chaque règle pour un mot de passe donné. */
export function checkPassword(pwd: string): { label: string; ok: boolean }[] {
  return passwordRules.map((r) => ({ label: r.label, ok: r.test(pwd) }));
}

/** true si toutes les règles sont satisfaites. */
export function isPasswordValid(pwd: string): boolean {
  return passwordRules.every((r) => r.test(pwd));
}

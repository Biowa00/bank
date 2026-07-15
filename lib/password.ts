/** Règles de validation du mot de passe, partagées client + serveur. */
export type PasswordRuleKey = "minLength" | "uppercase" | "digit";
export type PasswordRule = {
  /** Clé de traduction (voir dictionnaires `auth.passwordRules`). */
  key: PasswordRuleKey;
  test: (pwd: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { key: "minLength", test: (p) => p.length >= 8 },
  { key: "uppercase", test: (p) => /[A-Z]/.test(p) },
  { key: "digit", test: (p) => /[0-9]/.test(p) },
];

/** Renvoie l'état de chaque règle pour un mot de passe donné. */
export function checkPassword(pwd: string): { key: PasswordRuleKey; ok: boolean }[] {
  return passwordRules.map((r) => ({ key: r.key, ok: r.test(pwd) }));
}

/** true si toutes les règles sont satisfaites. */
export function isPasswordValid(pwd: string): boolean {
  return passwordRules.every((r) => r.test(pwd));
}

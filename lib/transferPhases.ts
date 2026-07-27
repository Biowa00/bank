/** Validation d'un virement par une série de codes envoyés par l'admin.
 *  Le nombre de codes n'est PAS fixe : l'admin en envoie autant qu'il veut
 *  (chacun avec un motif/intitulé libre), puis exécute le virement quand il
 *  le décide. Chaque code est à usage unique, expirant, avec un nombre limité
 *  de tentatives. */

/** Durée de validité d'un code (minutes). */
export const PHASE_CODE_TTL_MIN = 15;

/** Nombre maximal de tentatives de saisie d'un code avant blocage. */
export const PHASE_MAX_ATTEMPTS = 5;

/** Génère un code numérique à 6 chiffres. */
export function generatePhaseCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** true si un code est encore exploitable (envoyé et non expiré). */
export function isCodeActive(status: string, expiresAt: string): boolean {
  return status === "code_envoye" && new Date(expiresAt).getTime() > Date.now();
}

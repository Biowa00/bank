/** Déblocage d'un virement en 3 phases séquentielles, chacune confirmée par
 *  un code envoyé au client. */

export type PhaseNumber = 1 | 2 | 3;

export const TRANSFER_PHASES: {
  phase: PhaseNumber;
  name: string;
  adminLabel: string;
}[] = [
  { phase: 1, name: "Code de confirmation de mise en relation", adminLabel: "Valider phase 1" },
  { phase: 2, name: "Code d'approbation bancaire", adminLabel: "Valider phase 2" },
  { phase: 3, name: "Code d'activation de virement", adminLabel: "Valider phase 3" },
];

export const PHASE_TOTAL = 3;

/** Durée de validité d'un code de phase (minutes). */
export const PHASE_CODE_TTL_MIN = 15;

/** Nombre maximal de tentatives de saisie d'un code avant blocage. */
export const PHASE_MAX_ATTEMPTS = 5;

export function phaseName(phase: number): string {
  return TRANSFER_PHASES.find((p) => p.phase === phase)?.name ?? `Phase ${phase}`;
}

/** Génère un code numérique à 6 chiffres. */
export function generatePhaseCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** true si un code de phase est encore exploitable (envoyé et non expiré). */
export function isCodeActive(status: string, expiresAt: string): boolean {
  return status === "code_envoye" && new Date(expiresAt).getTime() > Date.now();
}

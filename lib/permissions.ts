import type { Profile } from "@/lib/types";

export type Permission = { allowed: boolean; reason?: string };

const FROZEN_REASON =
  "Votre carte est gelée. Dégelez-la depuis votre tableau de bord pour effectuer des opérations.";

/** Un dépôt exige une autorisation admin ; refusé si banni ou carte gelée. */
export function canDeposit(p: Profile): Permission {
  if (p.status === "banned")
    return { allowed: false, reason: p.status_reason ?? "Compte banni." };
  if (p.card_frozen) return { allowed: false, reason: FROZEN_REASON };
  if (!p.deposit_authorized)
    return {
      allowed: false,
      reason:
        "Les dépôts ne sont pas encore autorisés sur votre compte. Contactez votre conseiller.",
    };
  return { allowed: true };
}

/** Virement : compte actif et virements non bloqués. */
export function canTransfer(p: Profile): Permission {
  if (p.status === "banned")
    return { allowed: false, reason: p.status_reason ?? "Compte banni." };
  if (p.card_frozen) return { allowed: false, reason: FROZEN_REASON };
  if (p.status === "restricted")
    return {
      allowed: false,
      reason: p.status_reason ?? "Compte restreint : virements indisponibles.",
    };
  if (p.transfers_blocked)
    return {
      allowed: false,
      reason:
        p.transfers_block_reason ??
        "Les virements sont bloqués sur votre compte.",
    };
  return { allowed: true };
}

/** Retrait : compte actif et retraits non bloqués. */
export function canWithdraw(p: Profile): Permission {
  if (p.status === "banned")
    return { allowed: false, reason: p.status_reason ?? "Compte banni." };
  if (p.card_frozen) return { allowed: false, reason: FROZEN_REASON };
  if (p.status === "restricted")
    return {
      allowed: false,
      reason: p.status_reason ?? "Compte restreint : retraits indisponibles.",
    };
  if (p.withdrawals_blocked)
    return {
      allowed: false,
      reason:
        p.withdrawals_block_reason ??
        "Les retraits sont bloqués sur votre compte.",
    };
  return { allowed: true };
}

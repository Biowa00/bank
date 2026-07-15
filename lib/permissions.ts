import type { Profile } from "@/lib/types";

export type PermissionReasonKey =
  | "frozen"
  | "banned"
  | "depositNotAuthorized"
  | "transferRestricted"
  | "transfersBlocked"
  | "withdrawRestricted"
  | "withdrawalsBlocked";

/**
 * Résultat d'un contrôle d'autorisation. En cas de refus, on renvoie une clé de
 * traduction (`reasonKey`) OU un motif personnalisé saisi par l'admin en base
 * (`customReason`, non traduisible à la volée), qui a la priorité à l'affichage.
 */
export type Permission =
  | { allowed: true }
  | { allowed: false; reasonKey: PermissionReasonKey; customReason?: string };

function deny(
  reasonKey: PermissionReasonKey,
  customReason?: string | null,
): Permission {
  return { allowed: false, reasonKey, customReason: customReason ?? undefined };
}

/** Un dépôt exige une autorisation admin ; refusé si banni ou carte gelée. */
export function canDeposit(p: Profile): Permission {
  if (p.status === "banned") return deny("banned", p.status_reason);
  if (p.card_frozen) return deny("frozen");
  if (!p.deposit_authorized) return deny("depositNotAuthorized");
  return { allowed: true };
}

/** Virement : compte actif et virements non bloqués. */
export function canTransfer(p: Profile): Permission {
  if (p.status === "banned") return deny("banned", p.status_reason);
  if (p.card_frozen) return deny("frozen");
  if (p.status === "restricted") return deny("transferRestricted", p.status_reason);
  if (p.transfers_blocked) return deny("transfersBlocked", p.transfers_block_reason);
  return { allowed: true };
}

/** Retrait : compte actif et retraits non bloqués. */
export function canWithdraw(p: Profile): Permission {
  if (p.status === "banned") return deny("banned", p.status_reason);
  if (p.card_frozen) return deny("frozen");
  if (p.status === "restricted") return deny("withdrawRestricted", p.status_reason);
  if (p.withdrawals_blocked) return deny("withdrawalsBlocked", p.withdrawals_block_reason);
  return { allowed: true };
}

/** Résout le message d'un refus depuis le dictionnaire (motif custom prioritaire). */
export function permissionReason(
  perm: Extract<Permission, { allowed: false }>,
  reasons: Record<PermissionReasonKey, string>,
): string {
  return perm.customReason ?? reasons[perm.reasonKey];
}

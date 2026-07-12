export type AccountStatus = "active" | "restricted" | "banned";
export type UserRole = "user" | "admin";
export type TxType = "deposit" | "transfer" | "withdrawal" | "admin_credit";
export type TxStatus = "success" | "pending" | "blocked" | "rejected";
export type CodeStatus = "active" | "used" | "revoked";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  profession: string | null;
  address: string | null;
  phone: string | null;
  id_document_path: string | null;
  card_frozen: boolean;
  iban: string;
  balance: number;
  status: AccountStatus;
  status_reason: string | null;
  withdrawals_blocked: boolean;
  withdrawals_block_reason: string | null;
  transfers_blocked: boolean;
  transfers_block_reason: string | null;
  deposit_authorized: boolean;
  withdrawal_progress: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type TxDirection = "in" | "out";

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  direction: TxDirection;
  amount: number;
  status: TxStatus;
  counterparty_iban: string | null;
  counterparty_name: string | null;
  description: string | null;
  decline_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface WithdrawalAccount {
  id: string;
  user_id: string;
  label: string | null;
  iban: string;
  created_at: string;
}

export interface WithdrawalCode {
  id: string;
  name: string;
  code: string;
  reason: string | null;
  percentage_value: number;
  target_user_id: string | null;
  status: CodeStatus;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

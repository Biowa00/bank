-- =============================================================
--  Migration : contrôles back-office + jauge de retrait
--               + workflow de validation des virements
--  Idempotente — sûre à ré-exécuter. Cible : projet "banque".
-- =============================================================

-- ---------- Nouveaux types énumérés ----------
alter type tx_type   add value if not exists 'admin_credit';
alter type tx_status add value if not exists 'rejected';

-- ---------- profiles : autorisation dépôt + jauge de retrait ----------
alter table public.profiles
  add column if not exists deposit_authorized  boolean not null default false,
  add column if not exists withdrawal_progress integer not null default 0;

do $$ begin
  alter table public.profiles
    add constraint profiles_withdrawal_progress_range
    check (withdrawal_progress between 0 and 100);
exception when duplicate_object then null; end $$;

-- ---------- withdrawal_codes : valeur d'avancement de la jauge ----------
alter table public.withdrawal_codes
  add column if not exists percentage_value integer not null default 0;

do $$ begin
  alter table public.withdrawal_codes
    add constraint withdrawal_codes_percentage_range
    check (percentage_value between 0 and 100);
exception when duplicate_object then null; end $$;

-- ---------- transactions : validation admin des virements ----------
alter table public.transactions
  add column if not exists decline_reason text,
  add column if not exists reviewed_by    uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at    timestamptz;

-- Index pour lister rapidement les virements en attente côté admin.
create index if not exists idx_tx_pending_transfers
  on public.transactions (created_at desc)
  where type = 'transfer' and status = 'pending';

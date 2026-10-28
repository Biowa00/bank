-- =============================================================
--  Migration 0007 — virement par numéro de compte + SWIFT/BIC
--  Pour les banques hors zone IBAN (Amériques, Royaume-Uni, Australie).
--  `transfer_method` = 'iban' (défaut, existant) ou 'account'. En mode
--  'account', `counterparty_iban` reste NULL et la destination est décrite
--  par le numéro de compte, le pays, le code national éventuel (ABA,
--  transit, sort code, BSB) et `counterparty_bic` (migration 0003).
--  Sûr à ré-exécuter. À appliquer dans Supabase → SQL Editor.
-- =============================================================
alter table public.transactions
  add column if not exists transfer_method             text not null default 'iban',
  add column if not exists counterparty_account_number text,
  add column if not exists counterparty_country        text,
  add column if not exists counterparty_routing_type   text,
  add column if not exists counterparty_routing_code   text;

do $$ begin
  alter table public.transactions
    add constraint transactions_transfer_method_check
    check (transfer_method in ('iban', 'account'));
exception when duplicate_object then null; end $$;

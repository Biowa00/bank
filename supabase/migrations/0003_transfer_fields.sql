-- =============================================================
--  Migration 0003 — champs de virement enrichis
--  Ajoute BIC, nom de banque et devise sur les transactions.
--  Sûr à ré-exécuter (add column if not exists).
--  À appliquer dans Supabase → SQL Editor.
-- =============================================================
alter table public.transactions
  add column if not exists counterparty_bic  text,
  add column if not exists counterparty_bank text,
  add column if not exists currency          text not null default 'EUR';

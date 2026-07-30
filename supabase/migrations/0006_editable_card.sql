-- =============================================================
--  Migration 0006 — carte de crédit éditable par l'administrateur
--  Jusqu'ici les infos de carte (numéro, expiration, CVV, titulaire) étaient
--  CALCULÉES depuis l'IBAN (aucun stockage). L'admin peut désormais les
--  surcharger par client. Colonnes NULL = repli sur la valeur calculée.
--  Sûr à ré-exécuter. À appliquer dans Supabase → SQL Editor.
-- =============================================================
alter table public.profiles
  add column if not exists card_number text,
  add column if not exists card_exp    text,
  add column if not exists card_cvv    text,
  add column if not exists card_holder text;

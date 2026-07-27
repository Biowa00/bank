-- =============================================================
--  Migration 0004 — motif/intitulé libre des codes de virement
--  Chaque code de validation de virement porte désormais un libellé
--  personnalisé (saisi par l'admin, affiché au client) au lieu d'un nom
--  de phase fixe. Le nombre de codes n'est plus limité à 3.
--  Sûr à ré-exécuter. À appliquer dans Supabase → SQL Editor.
-- =============================================================
alter table public.transfer_phase_codes
  add column if not exists label text;

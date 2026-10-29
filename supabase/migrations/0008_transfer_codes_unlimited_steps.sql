-- =============================================================
--  Migration 0008 — codes de virement : étapes illimitées + nettoyage
--  1. La contrainte d'origine limitait l'étape d'un code à 1-3 (ancien
--     déblocage en 3 phases). L'admin peut désormais envoyer autant de codes
--     qu'il veut : le 4ᵉ code d'un virement échouait. On ne garde que phase ≥ 1.
--  2. Les codes envoyés puis expirés sans être saisis restaient en
--     `code_envoye` ; renvoyer un code créait alors 2 lignes `code_envoye`
--     pour la même étape (« Aucun code en attente » côté client). On les
--     passe en `expire`.
--  Sûr à ré-exécuter. À appliquer dans Supabase → SQL Editor.
-- =============================================================

-- Supprime toute contrainte CHECK portant sur `phase` (nom auto-généré
-- variable selon l'historique de la base), puis pose la contrainte à jour.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.transfer_phase_codes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%phase%'
  loop
    execute format('alter table public.transfer_phase_codes drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.transfer_phase_codes
  add constraint transfer_phase_codes_phase_check
  check (phase >= 1);

update public.transfer_phase_codes
  set status = 'expire'
  where status = 'code_envoye'
    and expires_at < now();

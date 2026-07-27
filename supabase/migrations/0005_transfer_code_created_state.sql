-- =============================================================
--  Migration 0005 — état « créé (non envoyé) » des codes de virement
--  L'admin crée d'abord le code (le champ de saisie + le motif apparaissent
--  côté client, SANS e-mail), puis l'envoie dans un second temps (l'e-mail
--  avec le code part). Nouveau statut `cree` en amont de `code_envoye`.
--  Sûr à ré-exécuter. À appliquer dans Supabase → SQL Editor.
-- =============================================================

-- Supprime toute contrainte CHECK portant sur `status` (nom auto-généré variable
-- selon l'historique de la base), puis pose la contrainte à jour.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.transfer_phase_codes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.transfer_phase_codes drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.transfer_phase_codes
  add constraint transfer_phase_codes_status_check
  check (status in ('cree', 'code_envoye', 'valide', 'expire'));

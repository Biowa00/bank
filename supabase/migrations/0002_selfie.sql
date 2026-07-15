-- ============================================================
--  Ajout du selfie à l'inscription (KYC)
--  Non destructif : ajoute une colonne nullable. Aucune donnée
--  existante n'est modifiée. Sûr à exécuter sur la base de prod.
-- ============================================================

alter table public.profiles
  add column if not exists selfie_path text;

-- Le selfie est stocké dans le bucket privé "documents" (déjà existant),
-- sous la clé "{user_id}/selfie.jpg". Aucune nouvelle policy nécessaire :
-- l'upload et la lecture se font via la clé service_role (côté serveur).

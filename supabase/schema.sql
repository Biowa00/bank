-- =============================================================
--  BANQUE SIMULÉE — Schéma Supabase (PostgreSQL)
--  Projet 100% pédagogique — aucune donnée réelle, aucun argent réel.
--  À coller dans : Supabase Dashboard > SQL Editor > New query > Run
-- =============================================================

-- ---------- Types énumérés ----------
do $$ begin
  create type account_status as enum ('active', 'restricted', 'banned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('deposit', 'transfer', 'withdrawal', 'admin_credit');
exception when duplicate_object then null; end $$;
-- Ajout du type si l'enum existait déjà sans lui.
alter type tx_type add value if not exists 'admin_credit';

do $$ begin
  create type tx_status as enum ('success', 'pending', 'blocked', 'rejected');
exception when duplicate_object then null; end $$;
-- 'rejected' = virement refusé par l'administration (fonds recrédités).
alter type tx_status add value if not exists 'rejected';

do $$ begin
  create type code_status as enum ('active', 'used', 'revoked');
exception when duplicate_object then null; end $$;

-- ---------- Table profiles ----------
create table if not exists public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text not null,
  full_name                text,
  first_name               text,
  last_name                text,
  city                     text,
  profession               text,
  address                  text,
  phone                    text,
  id_document_path         text,
  card_frozen              boolean not null default false,
  iban                     text unique not null,
  balance                  numeric(14,2) not null default 0 check (balance >= 0),
  status                   account_status not null default 'active',
  status_reason            text,
  withdrawals_blocked      boolean not null default false,
  withdrawals_block_reason text,
  transfers_blocked        boolean not null default false,
  transfers_block_reason   text,
  -- Contrôle back-office : autorisation de dépôt + jauge de progression du retrait (0-100).
  deposit_authorized       boolean not null default false,
  withdrawal_progress      integer not null default 0 check (withdrawal_progress between 0 and 100),
  role                     user_role not null default 'user',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ---------- Table transactions ----------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  type              tx_type not null,
  direction         text not null default 'out' check (direction in ('in', 'out')),
  amount            numeric(14,2) not null check (amount > 0),
  status            tx_status not null default 'success',
  counterparty_iban text,
  counterparty_name text,
  description       text,
  -- Validation admin des virements (workflow d'approbation).
  decline_reason    text,
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  -- Déblocage d'un virement en 3 phases : nb de phases confirmées par le client.
  unlock_phase      smallint not null default 0,
  created_at        timestamptz not null default now()
);

-- ---------- Table transfer_phase_codes (déblocage virement en 3 phases) ----------
create table if not exists public.transfer_phase_codes (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  phase          smallint not null check (phase between 1 and 3),
  code           text not null,
  status         text not null default 'code_envoye'
                   check (status in ('code_envoye', 'valide', 'expire')),
  attempts       int not null default 0,
  expires_at     timestamptz not null,
  created_by     uuid references public.profiles(id) on delete set null,
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_tpc_tx on public.transfer_phase_codes(transaction_id, phase);
create index if not exists idx_tx_user on public.transactions(user_id, created_at desc);

-- ---------- Table notifications ----------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id, created_at desc);

-- ---------- Table withdrawal_accounts (IBAN de destination enregistrés) ----------
create table if not exists public.withdrawal_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text,
  iban       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Table withdrawal_codes ----------
create table if not exists public.withdrawal_codes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  code           text not null,
  reason         text,
  -- Valeur d'avancement de la jauge de retrait (0 = code d'autorisation classique).
  percentage_value integer not null default 0 check (percentage_value between 0 and 100),
  target_user_id uuid references public.profiles(id) on delete cascade, -- null = générique
  status         code_status not null default 'active',
  used_by        uuid references public.profiles(id) on delete set null,
  used_at        timestamptz,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_code_status on public.withdrawal_codes(status);

-- ---------- Table admin_audit_log (non modifiable) ----------
create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references public.profiles(id) on delete set null,
  admin_email    text,
  action         text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  reason         text,
  details        jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_audit_created on public.admin_audit_log(created_at desc);

-- =============================================================
--  Row Level Security
-- =============================================================
alter table public.profiles           enable row level security;
alter table public.transactions       enable row level security;
alter table public.notifications      enable row level security;
alter table public.withdrawal_accounts enable row level security;
alter table public.withdrawal_codes   enable row level security;
alter table public.admin_audit_log    enable row level security;

-- Helper : l'utilisateur courant est-il admin ?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles : chacun voit/modifie son profil ; l'admin voit tout.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_limited" on public.profiles;
create policy "profiles_update_own_limited" on public.profiles
  for update using (id = auth.uid());
-- NB : les mutations sensibles (solde, statut, blocages) passent par la clé
-- service_role côté serveur, qui contourne la RLS.

-- transactions : l'utilisateur voit les siennes ; l'admin voit tout.
drop policy if exists "tx_select_own_or_admin" on public.transactions;
create policy "tx_select_own_or_admin" on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

-- notifications : l'utilisateur voit/marque les siennes.
drop policy if exists "notif_select_own_or_admin" on public.notifications;
create policy "notif_select_own_or_admin" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- withdrawal_accounts : l'utilisateur gère les siens.
drop policy if exists "wacc_all_own" on public.withdrawal_accounts;
create policy "wacc_all_own" on public.withdrawal_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- withdrawal_codes : seul l'admin lit (les users n'accèdent jamais aux codes en clair).
drop policy if exists "codes_admin_only" on public.withdrawal_codes;
create policy "codes_admin_only" on public.withdrawal_codes
  for select using (public.is_admin());

-- admin_audit_log : seul l'admin lit ; personne ne modifie/supprime (aucune policy update/delete).
drop policy if exists "audit_admin_read" on public.admin_audit_log;
create policy "audit_admin_read" on public.admin_audit_log
  for select using (public.is_admin());

-- =============================================================
--  Trigger : création automatique du profil + IBAN simulé à l'inscription
-- =============================================================
create or replace function public.generate_fake_iban()
returns text language plpgsql as $$
declare
  bban text := '';
  i int;
begin
  -- IBAN FR simulé : FR76 + 21 chiffres (format valide en longueur, NON routable).
  for i in 1..21 loop
    bban := bban || floor(random()*10)::int::text;
  end loop;
  return 'FR76' || bban;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  fn text := coalesce(new.raw_user_meta_data->>'first_name', '');
  ln text := coalesce(new.raw_user_meta_data->>'last_name', '');
  composed text := nullif(trim(fn || ' ' || ln), '');
begin
  insert into public.profiles (
    id, email, full_name, first_name, last_name,
    city, profession, address, phone, iban
  )
  values (
    new.id,
    new.email,
    coalesce(composed, new.raw_user_meta_data->>'full_name', ''),
    nullif(fn, ''),
    nullif(ln, ''),
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'phone',
    public.generate_fake_iban()
  );
  return new;
end $$;

-- NB : le bucket privé "documents" (Storage) stocke les pièces d'identité.
-- Créé via l'API Storage : { id: "documents", public: false }.

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
--  Migration additive (bases déjà créées) — sûr à ré-exécuter
-- =============================================================
alter table public.profiles
  add column if not exists deposit_authorized  boolean not null default false,
  add column if not exists withdrawal_progress integer not null default 0;
do $$ begin
  alter table public.profiles
    add constraint profiles_withdrawal_progress_range
    check (withdrawal_progress between 0 and 100);
exception when duplicate_object then null; end $$;

alter table public.withdrawal_codes
  add column if not exists percentage_value integer not null default 0;
do $$ begin
  alter table public.withdrawal_codes
    add constraint withdrawal_codes_percentage_range
    check (percentage_value between 0 and 100);
exception when duplicate_object then null; end $$;

alter table public.transactions
  add column if not exists decline_reason text,
  add column if not exists reviewed_by    uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at    timestamptz,
  add column if not exists unlock_phase   smallint not null default 0;

-- Table + RLS des codes de phase (idempotent).
create table if not exists public.transfer_phase_codes (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  phase          smallint not null check (phase between 1 and 3),
  code           text not null,
  status         text not null default 'code_envoye'
                   check (status in ('code_envoye', 'valide', 'expire')),
  attempts       int not null default 0,
  expires_at     timestamptz not null,
  created_by     uuid references public.profiles(id) on delete set null,
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_tpc_tx on public.transfer_phase_codes(transaction_id, phase);
alter table public.transfer_phase_codes enable row level security;
drop policy if exists "tpc_admin_read" on public.transfer_phase_codes;
create policy "tpc_admin_read" on public.transfer_phase_codes
  for select using (public.is_admin());

-- =============================================================
--  FIN. Pour promouvoir un compte en admin (après inscription) :
--    update public.profiles set role = 'admin' where email = 'ton-admin@exemple.com';
-- =============================================================

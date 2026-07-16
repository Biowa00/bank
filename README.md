# Vantex Bank — Banque simulée (projet pédagogique)

> ⚠️ **Application 100 % fictive et pédagogique.** Aucun argent réel, aucun
> moyen de paiement, aucune donnée bancaire réelle. Les IBAN générés sont
> **simulés** (format valide mais non routable). Ne pas utiliser en production.

Application bancaire de démonstration : landing page, inscription/connexion,
espace client (dépôt, virement, retrait par code, notifications, historique) et
backoffice administrateur (gestion des comptes, statuts, blocages, codes de
retrait, journal d'audit).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth) — session par cookies

## Installation

```bash
npm install
```

### 1. Créer un projet Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Une fois provisionné, ouvre **SQL Editor** et exécute le contenu de
   [`supabase/schema.sql`](supabase/schema.sql) (tables, RLS, trigger IBAN).
3. Dans **Authentication → Providers → Email**, pour une démo fluide, désactive
   **« Confirm email »** (connexion immédiate après inscription).

### 2. Variables d'environnement

Copie `.env.local.example` en `.env.local` puis remplis (Supabase → Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=...        # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # clé anon / publishable
SUPABASE_SERVICE_ROLE_KEY=...       # clé service_role (SECRÈTE)
```

> La clé `service_role` n'est utilisée que côté serveur (mutations d'argent et
> actions admin). Elle n'est jamais exposée au navigateur.

### 3. Lancer

```bash
npm run dev
```

→ http://localhost:3000

### 4. Créer un administrateur

Inscris-toi normalement, puis dans **SQL Editor** de Supabase :

```sql
update public.profiles set role = 'admin' where email = 'ton-email@exemple.com';
```

Connexion admin : `/admin/login`.

## Architecture

```
app/
  page.tsx                 Landing page
  (auth)/                  Inscription / connexion
  dashboard/               Espace client (+ actions.ts : dépôt/virement/retrait)
  admin/
    login/                 Connexion admin
    (protected)/           Backoffice (garde de rôle)
  admin/actions.ts         Actions admin (statuts, blocages, codes) + audit
lib/
  supabase/                Clients browser / server / service-role + proxy
  auth.ts, permissions.ts, format.ts, types.ts
components/                UI partagée (client + serveur)
supabase/schema.sql        Schéma PostgreSQL complet
proxy.ts                   Rafraîchissement de session + gardes de routes
```

### Sécurité (démo)

- **RLS** activée sur toutes les tables : chaque client ne lit que ses données.
- Les **mutations sensibles** (solde, statut, codes) passent par des *server
  actions* utilisant la clé `service_role`, après vérification de l'identité.
- Le **journal d'audit** (`admin_audit_log`) n'a aucune policy d'écriture/màj :
  il est inaltérable côté client.

## Avertissement

Vantex Bank ne fournit aucun service bancaire réel, ne détient aucun agrément et ne
traite aucune valeur réelle. Toute ressemblance avec une banque existante est
fortuite. Usage strictement pédagogique.

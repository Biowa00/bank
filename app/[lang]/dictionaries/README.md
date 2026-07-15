# Dictionnaires i18n

Chaque langue a un dossier (`fr/`, `en/`, …) contenant 7 fichiers de zone :

| Fichier          | Contenu                                                        |
| ---------------- | ------------------------------------------------------------- |
| `common.json`    | Marque, actions génériques, libellés de statut (partagés)     |
| `landing.json`   | Page d'accueil publique                                       |
| `auth.json`      | Connexion, inscription, mot de passe oublié, login admin      |
| `dashboard.json` | Espace client (pages + composants + permissions)              |
| `admin.json`     | Back-office admin *(non encore extrait — voir « Reste »)*     |
| `errors.json`    | Messages d'erreur/succès des server actions                   |
| `emails.json`    | Notifications in-app + e-mails (`notify` + `chrome`)          |

## Langue source et repli

- **`fr/`** est la source de vérité : le type `Dictionary` (voir
  `app/[lang]/dictionaries.ts`) en est dérivé, ce qui **force la parité des clés**
  à la compilation.
- `getDictionary()` **retombe sur `fr`** pour toute zone ou clé absente d'une
  autre langue. Une traduction partielle dégrade donc proprement vers le français
  au lieu d'afficher `undefined`.
- Une langue sans dossier fonctionne : détection, routing `/xx/…` et sélecteur
  restent opérationnels, le contenu s'affiche en français jusqu'à traduction.

## Ajouter une langue

1. Copier `fr/*.json` dans `xx/` (où `xx` est un code de `lib/i18n/config.ts`).
2. Traduire les **valeurs** uniquement, sans toucher aux clés ni aux jetons
   `{amount}`, `{iban}`, `{n}`, `{pct}`, `{progress}`, `{phase}`, `{total}`,
   `{date}`, `{name}`, `{from}`.
3. `npm run build` : si une clé manque ou diffère, `tsc` échoue (parité forcée).

> ⚠️ **Qualité bancaire** : la traduction automatique n'est pas acceptable en
> production pour une UI financière réglementée. Faire relire par un locuteur
> natif au minimum `errors.json`, `emails.json` et les chaînes légales/sécurité
> avant mise en ligne.

## État actuel

- **Traduit** : `fr` (source) + `en` (complet) pour `common`, `landing`, `auth`,
  `dashboard`, `errors`, `emails`.
- **Reste à faire** :
  - Contenu des 11 autres langues (`de, es, it, pt, pl, sl, bg, sk, cs, el, hu`)
    — repli sur `fr` en attendant.
  - Zone **admin** (`admin.json` + extraction des chaînes de `app/[lang]/admin/**`
    et `app/[lang]/admin/actions.ts`).
  - Chrome des e-mails dans `lib/email.ts` (`<html lang>`, en-tête/pied) et
    langue **du destinataire** dans `lib/notify.ts` (colonne `profiles.locale`).
    Aujourd'hui les notifications/e-mails sont rendus dans la langue de
    l'utilisateur **actif** au moment de l'action.

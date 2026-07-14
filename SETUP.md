# UROSI-T — Branchement du backend Supabase

> Ce que ce depot contient : migrations SQL (schema, RLS, triggers), client
> Supabase type, auth, architecture front branchee dessus.
> Ce que **tu** executes (acces a ta prod Supabase) : appliquer les
> migrations, regler l'auth, poser les cles.

## 1. Appliquer les migrations

**Option A — SQL Editor (le plus simple)**
Dashboard Supabase -> SQL Editor -> colle puis execute, dans l'ordre :
1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`

**Option B — CLI**
```bash
npm i -g supabase
supabase link --project-ref <ton-project-ref>
supabase db push
```

(Optionnel, dev local uniquement) jeu de donnees de demo :
```bash
supabase db reset   # applique migrations + supabase/seed.sql
```
Ne jamais executer `seed.sql` sur un projet de production : il cree des
comptes `auth.users` avec un mot de passe connu (`demo-password`).

## 2. Configurer l'authentification (Dashboard -> Authentication)
- **Providers -> Email** : active.
- **Confirm email** : a activer pour la prod (en dev tu peux le couper pour
  tester vite).
- **URL Configuration -> Site URL** : `http://localhost:5173` en dev, ton
  domaine de prod ensuite.
- **Redirect URLs** : ajoute ton domaine de prod.

Le trigger `handle_new_user` (migration `0002_functions.sql`) cree
automatiquement la ligne `profiles` a chaque inscription, avec le `role`
passe dans les metadonnees (`worker` / `structure_admin`) via
`supabase.auth.signUp({ options: { data: { role } } })`.

## 3. Variables d'environnement
```bash
cp .env.example .env
```
Renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
(Dashboard -> Project Settings -> API). Sur ta plateforme d'hebergement,
ajoute les deux `VITE_*` en variables d'environnement de build.

## 4. Lancer
```bash
npm install
npm run dev   # http://localhost:5173
npm test      # suite de tests Vitest
npm run build # typecheck + build de production
```

## 5. Tester le chemin critique
1. Cree un compte "Structure" et un compte "Travailleur" via l'ecran
   d'inscription de l'app.
2. Connecte en tant que structure : l'app te propose de creer ta structure,
   puis de publier une mission (titre, ville, date, duree <= 5h, taux net).
3. Connecte en tant que travailleur, tu dois voir la mission dans la liste
   des missions ouvertes ; clique "Postuler".
4. Reconnecte-toi en structure : la candidature apparait dans "Voir les
   candidatures" ; accepte-la.
5. Verifie le plafond legal : tente d'accepter une 4e journee consecutive
   chez la meme structure pour un travailleur non micro-entrepreneur ->
   l'insert/update doit etre bloque par le trigger
   `applications_consecutive_days_cap`.

## 6. Parcours KYC (verification d'identite + IBAN)

Le parcours de verification se declenche des qu'un travailleur accepte sa
**premiere mission remuneree**. Migration : `0020_kyc_verifications.sql`.

1. **Applique la migration** `supabase/migrations/0020_kyc_verifications.sql`
   (SQL Editor ou `supabase db push`). Elle cree les tables
   `kyc_verifications` / `kyc_status_history`, leurs policies RLS, le **bucket
   prive `kyc-documents`** (avec policies storage owner-only) et les fonctions
   fondateur.
2. **Bucket** : la migration cree le bucket en prive. Verifie dans
   Dashboard -> Storage que `kyc-documents` existe bien et reste **prive**
   (jamais public). Les pieces d'identite n'y sont accessibles que par leur
   proprietaire (policies RLS sur `storage.objects`).
3. **Mode** : variable d'env optionnelle `VITE_KYC_MODE`.
   - `simulation` (defaut) : la validation se fait a la main dans le tableau de
     bord fondateur (boutons Valider / Refuser / Demander un document).
   - `lemonway` : les actions manuelles sont masquees ; les statuts viendront
     des webhooks Lemonway (voir plus bas).
4. **Acces fondateur** : bouton discret (le `·` en bas de l'ecran d'accueil)
   -> `/fondateur` -> **code d'acces `AGORA59`**. Le code est verifie
   cote serveur dans les RPC `founder_*`.
   > ⚠️ Prototype : ce code est un simple secret partage. En production,
   > remplace-le par une vraie autorisation (role admin / claim JWT) et deplace
   > les changements de statut vers une Edge Function.
5. **Paiements bloques** : tant qu'un travailleur n'est pas `verified`, aucune
   ligne `payments` ne peut etre creee pour lui (trigger
   `enforce_kyc_before_payment`, non contournable meme en service_role).

### Brancher Lemonway plus tard (sans refonte)
L'architecture est prevue pour : colonnes `provider` / `provider_ref` sur
`kyc_verifications`, source d'historique (`kyc_status_history.source`) et RPC
isolees. Pour passer en reel :
1. Passe `VITE_KYC_MODE=lemonway`.
2. Cree une Edge Function (service_role) qui recoit les webhooks Lemonway,
   fait `select set_config('app.kyc_source','lemonway_webhook', true)` puis
   met a jour `kyc_verifications.status` (+ `provider_ref`). Le trigger
   d'historique enregistre alors la source `lemonway_webhook` automatiquement.
3. Remplace le garde par code des RPC `founder_*` par un controle de role.

## Ce qui reste a brancher (hors perimetre de cette passe)
- **Lemonway** : les tables (`lemonway_accounts`, `payments`) et le
  cantonnement sont modelises, mais les appels API Lemonway doivent vivre
  dans des **Edge Functions** (service_role), jamais cote client.
- **Indice de fiabilite affiche aux structures** : la vue `reliability_index`
  est en `security_invoker` -> chacun voit le sien. Pour exposer l'indice
  d'un travailleur a une structure (informatif, non-determinant), prevoir
  une RPC controlee plutot qu'un acces direct.
- **Generation automatique des types** : `src/types/database.types.ts` est
  aligne manuellement sur les migrations. Des que le projet est lie en CLI,
  remplace-le par `supabase gen types typescript --linked > src/types/database.types.ts`.

## Note d'architecture
Modele mandataire respecte dans le schema : aucune colonne ne permet a la
plateforme de fixer un prix ou de filtrer l'acces via l'indice. Plafond 5h =
contrainte `CHECK` sur `missions.duration_minutes`. Plafond 3 jours
consecutifs = trigger automatique sur `applications`. Contestabilite RGPD
Art. 22 = table `reliability_disputes`.

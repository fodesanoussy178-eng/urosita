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
- **URL Configuration -> Site URL** : `https://urosi.fr` en prod
  (`http://localhost:5173` en dev).
- **Redirect URLs** : ajoute `https://urosi.fr/**` (et
  `http://localhost:5173/**` pour le dev). Le front passe
  `emailRedirectTo: window.location.origin` au signUp, donc le lien de
  confirmation revient sur le domaine qui a servi l'inscription.

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

## 5. Mise en ligne sur urosi.fr (Vercel)

Le depot contient deja `vercel.json` (rewrite SPA vers `index.html`).

1. **Importer le projet** : dashboard Vercel -> Add New -> Project -> ce
   depot GitHub. Framework preset : Vite (build `npm run build`, output
   `dist/`, detecte automatiquement).
2. **Variables d'environnement** (Settings -> Environment Variables) :
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis redeploie.
3. **Domaine** : Settings -> Domains -> ajoute `urosi.fr` et `www.urosi.fr`
   (Vercel propose la redirection www -> apex). Chez ton registrar, cree les
   enregistrements DNS que Vercel affiche — typiquement un enregistrement
   `A` sur l'apex et un `CNAME cname.vercel-dns.com` sur `www` (reprends les
   valeurs exactes du dashboard). Le certificat HTTPS est emis
   automatiquement.
4. **Supabase** : reporte `https://urosi.fr` en Site URL et dans les
   Redirect URLs (section 2 ci-dessus), sinon les emails de confirmation
   pointeront vers localhost.

## 6. Tester le chemin critique
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

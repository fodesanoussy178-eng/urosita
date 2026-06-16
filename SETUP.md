# UROSI T — Branchement du backend Supabase

> Ce que Claude a généré : migrations SQL, RLS, client, auth, app branchée.
> Ce que **tu** exécutes (accès à ta prod) : appliquer les migrations, régler l'auth, poser les clés.

## 1. Appliquer les migrations

**Option A — SQL Editor (le plus simple)**
Dashboard Supabase → SQL Editor → colle puis exécute, dans l'ordre :
1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`

**Option B — CLI**
```bash
npm i -g supabase
supabase link --project-ref hcmqwngwxsqfjbngboyy
supabase db push
```

## 2. Configurer l'authentification (Dashboard → Authentication)
- **Providers → Email** : activé.
- **Confirm email** : à activer pour la prod (en dev tu peux le couper pour tester vite).
- **URL Configuration → Site URL** : `http://localhost:5173` en dev, ton domaine Vercel en prod.
- **Redirect URLs** : ajoute le domaine Vercel.

Le trigger `handle_new_user` (migration 0002) crée automatiquement la ligne `profiles`
à chaque inscription, avec le `role` passé dans les métadonnées (worker / structure_admin).

## 3. Variables d'environnement
```bash
cp .env.example .env
```
Renseigne `VITE_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API → anon public).
Sur Vercel : Project → Settings → Environment Variables, ajoute les deux `VITE_*`.

## 4. Lancer
```bash
npm install
npm run dev   # http://localhost:5173
```

## 5. Tester le chemin critique
1. Crée un compte "Structure" et un compte "Travailleur".
2. (SQL Editor) insère une structure + une mission `status='open'` rattachée.
3. Connecté en travailleur, tu dois voir la mission ; candidate.
4. Vérifie le plafond : tente d'accepter une 4e journée consécutive chez la même
   structure pour un travailleur non micro-entrepreneur → l'insert doit être bloqué.

---

## Ce qui reste à brancher (hors périmètre de cette passe)
- **Lemonway** : les tables (`lemonway_accounts`, `payments`) et le cantonnement sont
  modélisés, mais les appels API Lemonway doivent vivre dans des **Edge Functions**
  (service_role), jamais côté client. C'est le prochain gros morceau.
- **Indice de fiabilité affiché aux structures** : la vue `reliability_index` est en
  `security_invoker` → chacun voit le sien. Pour exposer l'indice d'un travailleur à une
  structure (informatif, non-déterminant), prévoir une RPC contrôlée plutôt qu'un accès direct.
- **Seed de données** : aucun jeu de données d'exemple n'est fourni.

## Note d'architecture
Modèle mandataire respecté dans le schéma : aucune colonne ne permet à la plateforme de
fixer un prix ou de filtrer l'accès via l'indice. Plafond 5h = contrainte CHECK sur
`missions.duration_minutes`. Plafond 3 jours consécutifs = trigger automatique sur
`applications`. Contestabilité RGPD Art. 22 = table `reliability_disputes`.

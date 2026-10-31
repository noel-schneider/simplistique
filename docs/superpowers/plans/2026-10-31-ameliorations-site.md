# Améliorations du site après l'enrichissement du corpus — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** rendre la simplistique crédible (preuve et sources visibles) et ouverte au grand public (proposer un terme sans GitHub, quiz, accueil qui accroche), et garder le corpus lisible à 40+ fiches (familles de disciplines, motifs transversaux).

**Architecture :** tout le contenu reste en fichiers versionnés validés par Zod au build ; seules les données d'interaction (propositions, réponses de quiz) vont dans la base Neon déjà utilisée par les votes, avec le même découpage `service` / `depot` (interface + implémentation en mémoire pour les tests + implémentation Postgres) que `lib/votes`.

**Tech Stack :** Next.js 16.3 (App Router, rendu statique), React 19, Zod 4, gray-matter, Tailwind, Vitest + Testing Library, `@neondatabase/serverless`, `next/og` pour les images de partage.

**Spec :** section « Décisions » ci-dessous. L'auteur a demandé de démarrer sans phase de conception écrite ; les décisions reprennent les huit pistes validées dans la conversation du 2026-10-31, et chaque arbitrage non tranché par l'auteur est marqué *(choix de l'implémenteur du plan)*.

## Décisions

1. **Démonstration** — supprimer les 10 fiches et 2 chantiers marqués `demonstration: true`. Le mécanisme de marquage (champ, bandeau, pastille) reste dans le code *(choix)* : il resservira pour du contenu de test.
2. **Niveau de preuve** — champ requis `preuve` sur chaque fiche, liste fermée de trois valeurs : `intuition` (l'analyse vient de l'auteur), `documentee` (un spécialiste de la discipline a écrit que le nom pose problème), `mesuree` (une enquête ou une expérience chiffre la confusion). Liste fermée comme les statuts : type TypeScript + constante + `content/taxonomies/preuves.yml` pour les libellés.
3. **Sources** — champ facultatif `sources`, tableau d'objets `{ auteur, annee, titre, url?, lecture }`, `lecture ∈ { originale, seconde-main }`. Rendu en bas de fiche, section « Sources ». `lint:content` avertit si `preuve` vaut `documentee` ou `mesuree` sans aucune source, et liste les sources `seconde-main` à relire.
4. **Précédents** — champ facultatif `precedents`, tableau `{ lieu, annee, description }`. Rendu en encadré « Déjà fait ailleurs » avant le corps. Pas de nouveau statut : la spec v1 ferme la liste des statuts.
5. **Familles** — `content/taxonomies/familles.yml` (`slug, nom, description`) ; chaque discipline porte un champ requis `famille`. La carte regroupe les zones sous un titre par famille. Pas de filtre par famille *(choix : YAGNI)*.
6. **Motifs** — un motif est un piège de vocabulaire qui revient dans plusieurs disciplines. Fichier `content/motifs/<slug>.md` (`nom, resume, cree, modifie` + corps libre) ; une fiche le rejoint par un champ facultatif `motifs: [slug, …]`. Routes `/motifs` et `/motifs/<slug>`, lien « Motifs » dans la navigation. Différence avec un chantier : un chantier réunit des fiches d'**une** discipline qui doivent bouger ensemble ; un motif relie des fiches de disciplines **différentes** qui partagent un piège.
7. **Accueil et partage** — champ facultatif `accroche` (140 caractères max), une phrase-choc. L'accueil garde son intro et ajoute une section « Le saviez-vous ? » avec jusqu'à 3 fiches ayant une accroche, choisies de façon déterministe (preuve `mesuree` d'abord, puis `documentee`, puis ordre alphabétique du terme) *(choix)*, et un lien vers les motifs. Chaque fiche a une image de partage générée au build (`opengraph-image.tsx`) : terme, accroche ou résumé, discipline.
8. **Proposer un terme** — page `/proposer`, formulaire sans compte : `terme` (requis, ≤ 120), `discipline` (texte libre, ≤ 80), `pourquoi` (requis, 20 à 2000), `suggestion` (≤ 200), `contact` (≤ 200, facultatif). Champ piège invisible `site` : rempli → réponse 200 sans enregistrement. Stockage table `propositions`. Limite 5 propositions par heure et par empreinte. Modération : script `npm run propositions` (liste les non traitées) et `npm run propositions -- --traiter <id>`. `/contribuer` renvoie vers `/proposer` pour le grand public et garde GitHub pour les fiches complètes.
9. **Quiz** — champ facultatif `quiz: { question, reponses: [{ texte, juste }], explication }` : 2 à 5 réponses, exactement une `juste: true`. Le lecteur choisit une réponse, puis voit la bonne, l'explication et la répartition des réponses des autres. Une réponse par fiche et par empreinte, non modifiable *(choix : sinon on vote pour la bonne réponse après l'avoir vue)*. Réponse identifiée par empreinte de son texte (`empreinteAlternative`), jamais par sa position. Table `reponses_quiz`. Limite 30 réponses par heure.

## Global Constraints

- Aucun slug de discipline, de confusion ou de famille codé en dur hors de `content/taxonomies/*.yml`. Exceptions : listes fermées `Statut` / `STATUTS` et, nouvellement, `Preuve` / `PREUVES`, et `Lecture` (`originale` | `seconde-main`).
- Chaque page est générée au build (`dynamicParams = false` sur toute route à paramètre) ; seules les routes `app/api/*` sont dynamiques (`export const dynamic = 'force-dynamic'`).
- Le front-matter est un `z.strictObject` : toute clé inconnue fait échouer le build. Les nouveaux champs suivent cette règle, objets imbriqués compris.
- Écriture en base : vérifier `sec-fetch-site` (refus 403 si présent et différent de `same-origin`), empreinte via `empreinteVotant(SEL_VOTES, ip, navigateur)`, journaliser seulement nom de classe et code SQLSTATE, jamais `erreur.message`.
- Toutes les migrations sont idempotentes (`IF NOT EXISTS`).
- Code, commentaires, messages d'erreur et textes du site en français ; apostrophe typographique `’` et guillemets `« »` dans les contenus.
- Avant d'écrire du code Next (images de partage, routes), lire le guide correspondant dans `node_modules/next/dist/docs/` (exigence d'`AGENTS.md`).
- Après chaque tâche : `npm run lint:content`, `npm run test:once` et, si une route change, `npm run build` passent.

## Review Focus

- Fiche existante sans `preuve` après la tâche 2 : le build doit échouer avec un message qui nomme le fichier et le champ, pas une erreur Zod brute. → test dans la tâche 2.
- Quiz dont le texte d'une réponse change après publication : les anciennes réponses ne doivent pas être comptées pour la nouvelle formulation, ni planter la lecture. → test dans la tâche 11 (`ignore les empreintes inconnues`).
- Proposition avec champ piège rempli ou corps non JSON : jamais d'erreur 500, jamais d'écriture. → tests dans la tâche 9.
- Motif désigné par une fiche mais absent de `content/motifs/` : erreur de build explicite (comme `chantier`). → test dans la tâche 6.
- Base indisponible ou variables absentes : le formulaire et le quiz affichent un message lisible et la fiche reste lisible (le quiz montre quand même la bonne réponse). → tests dans les tâches 10 et 12.

---

### Task 1 : Retirer le contenu de démonstration

**Files :**
- Delete : les 10 fiches et 2 chantiers listés par `grep -rl "demonstration: true" content`
- Modify : `lib/content/fiches.test.ts` (compte exact), et tout test qui lit le corpus réel et compte ou nomme des fiches de démonstration (`app/sitemap.test.ts`, `lib/content/index.test.ts`, `lib/content/chantiers.test.ts` s'il compte les chantiers réels)

- [ ] **Step 1 :** supprimer les fichiers, vérifier qu'aucune fiche restante ne désigne `charges-invisibles` ou `structures-algebriques`.
- [ ] **Step 2 :** `npm run test:once` ; corriger les attentes du corpus réel : `getFiches(DOSSIER_CONTENU)` → 40 fiches ; chantiers réels → 1 (`vocabulaire-du-bilan`). Les tests unitaires qui fabriquent un corpus factice avec `demonstration: true` restent intacts.
- [ ] **Step 3 :** `npm run lint:content` affiche `Aucune page de démonstration.` ; `npm run build` passe.
- [ ] **Step 4 :** commit `Retirer le contenu de démonstration`.

### Task 2 : Niveau de preuve et sources dans le schéma, l'index et la fiche

**Files :**
- Create : `content/taxonomies/preuves.yml`, `components/badge-preuve.tsx`, `components/sources.tsx`
- Modify : `lib/content/schema.ts`, `lib/content/taxonomies.ts`, `lib/content/fiches.ts` (`getIndex`), `lib/filtrage.ts`, `components/filtres.tsx`, `components/corpus.tsx`, `components/vue-liste.tsx` (colonne « Preuve »), `components/entete-fiche.tsx`, `app/fiches/[slug]/page.tsx`, `scripts/coherence.ts`
- Test : `lib/content/schema.test.ts` (ou le fichier de test de schéma existant), `lib/content/taxonomies.test.ts`, `lib/filtrage.test.ts`, `scripts/coherence.test.ts`, `components/sources.test.tsx`

**Interfaces :**
- Produces :
  - `export type Preuve = 'intuition' | 'documentee' | 'mesuree'` ; `export const PREUVES = ['intuition', 'documentee', 'mesuree'] as const satisfies readonly Preuve[]`
  - `export type Lecture = 'originale' | 'seconde-main'`
  - `export type Source = { auteur: string; annee: number; titre: string; url?: string; lecture: Lecture }`
  - `FicheMeta` gagne `preuve: Preuve` et `sources: Source[]` (absent → `[]`)
  - `Taxonomies` gagne `preuves: EntreeTaxonomie[]`
  - `FicheIndex` gagne `preuve`
  - `Criteres` gagne `preuves: string[]`, lu et écrit dans l'URL sous `?preuve=` ; `SlugsValides` gagne `preuves`
  - `<BadgePreuve preuve nom />`, `<Sources sources />`

- [ ] **Step 1 : tests de schéma**
  - `refuse une fiche sans preuve` : message contient `preuve`.
  - `refuse une preuve hors liste` (`preuve: forte`).
  - `accepte sources absentes et les rend comme []`.
  - `refuse une source sans lecture`, `refuse une lecture inconnue`, `refuse une clé inconnue dans une source` (strict), `refuse une url qui n'est pas http(s)`.
  - `accepte une annee entière entre 1500 et l'année courante + 1`.
- [ ] **Step 2 : test de taxonomies** — `preuves.yml doit contenir exactement intuition, documentee, mesuree` (même mécanisme que `statuts.yml`).
- [ ] **Step 3 :** lancer, constater l'échec ; implémenter dans `schema.ts` et `taxonomies.ts`. `preuves.yml` : libellés « Intuition d’auteur », « Documentée par des spécialistes », « Mesurée » avec une description d'une phrase chacun.
- [ ] **Step 4 : test de filtrage** — `filtre par preuve`, `ignore une preuve inconnue dans l’URL`, `écrit ?preuve= et le relit`.
- [ ] **Step 5 : tests de cohérence** — `avertit si preuve documentee ou mesuree sans source` ; `liste chaque source lue de seconde main` (un avertissement par source, message contenant auteur et année) ; `n’avertit pas une intuition sans source`.
- [ ] **Step 6 : test de rendu** — `Sources` affiche auteur, année, titre, lien quand `url` existe, et la mention « lue de seconde main » pour `lecture: seconde-main` ; ne rend rien pour un tableau vide.
- [ ] **Step 7 :** implémenter filtrage, filtres, colonne, badge dans l'en-tête (à côté du statut), section « Sources » après la prose.
- [ ] **Step 8 :** tests verts. Le build échoue encore (fiches sans `preuve`) : c'est attendu, la tâche 3 le répare. Ne pas commiter un état qui casse le build : enchaîner la tâche 3 avant le commit, ou commiter les deux ensemble.

### Task 3 : Renseigner preuve et sources des 40 fiches

**Files :** Modify : les 40 fiches de `content/fiches/`, `content/contribuer.md`

- [ ] **Step 1 :** ajouter `preuve` à chaque fiche selon ce tableau :
  - `mesuree` : `significatif-statistiques`, `risque-de-pluie-meteorologie`, `inflation-baisse-economie`, `tranche-imposition-fiscalite`, `consommer-de-preference-alimentation`.
  - `intuition` : `groupe-mathematiques`, `actif-comptabilite`, `passif-comptabilite`, `statique-escalade`, `mesure-theorie-musicale`, `fiduciaire-economie`, `salaire-net-travail`, `agios-banque`, `decouvert-autorise-banque`, `ticket-moderateur-sante`, `nevrosisme-psychologie`.
  - `documentee` : toutes les autres.
- [ ] **Step 2 :** pour chaque fiche `documentee` ou `mesuree`, transcrire en `sources` les références nommées dans sa section « D’où ça vient ». `lecture: originale` uniquement pour celles dont la PR #6, #7 ou #8 indique qu'elles ont été lues ; `seconde-main` pour toutes les autres. Ne jamais ajouter une référence absente du texte de la fiche ; `url` seulement si elle figure dans les rapports de recherche cités dans ces PR.
- [ ] **Step 3 :** `npm run lint:content` : aucune erreur ; les seuls avertissements sont les sources de seconde main. `npm run build` passe.
- [ ] **Step 4 :** `content/contribuer.md` : décrire `preuve`, `sources` et les trois niveaux, dans la section des champs du front-matter (« les neuf champs » devient la liste à jour).
- [ ] **Step 5 :** commit (avec la tâche 2) `Afficher le niveau de preuve et les sources de chaque fiche`.

### Task 4 : Précédents

**Files :** Create : `components/precedents.tsx` ; Modify : `lib/content/schema.ts`, `app/fiches/[slug]/page.tsx`, `content/fiches/dominant-biologie.md`, `content/fiches/schizophrenie-medecine.md`, `content/fiches/consommer-de-preference-alimentation.md`, `content/contribuer.md` ; Test : test de schéma, `components/precedents.test.tsx`

**Interfaces :** Produces `export type Precedent = { lieu: string; annee: number; description: string }` ; `FicheMeta.precedents: Precedent[]` (absent → `[]`) ; `<Precedents precedents />`.

- [ ] **Step 1 : tests** — schéma : `accepte precedents absents`, `refuse un précédent sans description`, `refuse une clé inconnue`. Rendu : titre « Déjà fait ailleurs », une ligne « lieu, année — description » par entrée ; rien pour `[]`.
- [ ] **Step 2 :** implémenter ; encadré rendu entre l'en-tête et la prose.
- [ ] **Step 3 : contenu** — Japon 2017 (Société japonaise de génétique, termes « apparent » / « latent ») ; Japon 2002 (« trouble de l’intégration ») ; France 2022 (mention « Pour une dégustation optimale »). Uniquement ce que disent déjà les fiches.
- [ ] **Step 4 :** documenter le champ dans `contribuer.md` ; lint, tests, build ; commit `Montrer les précédents : renommages déjà adoptés ailleurs`.

### Task 5 : Familles de disciplines et carte groupée

**Files :** Create : `content/taxonomies/familles.yml` ; Modify : `lib/content/schema.ts` (`schemaDiscipline` gagne `famille`), `lib/content/taxonomies.ts`, `content/taxonomies/disciplines.yml`, `components/vue-carte.tsx`, `components/corpus.tsx`, `app/fiches/page.tsx` ; Test : `lib/content/taxonomies.test.ts`, `components/vue-carte.test.tsx`

**Interfaces :** Produces `Taxonomies.familles: EntreeTaxonomie[]` ; `Discipline.famille: string` ; `VueCarte` reçoit `familles: EntreeTaxonomie[]`.

- [ ] **Step 1 : tests taxonomies** — `refuse une discipline sans famille`, `refuse une famille inconnue` (message nomme la discipline et la famille), `refuse familles.yml vide`.
- [ ] **Step 2 : test carte** — `regroupe les zones sous le titre de leur famille, dans l’ordre de familles.yml` ; `n’affiche pas une famille sans discipline`.
- [ ] **Step 3 :** implémenter. Familles et rattachement :
  - `sciences` « Sciences » : mathematiques, statistiques, informatique, physique, biologie, psychologie, systemique, medecine
  - `societe` « Société » : economie, comptabilite, droit, philosophie
  - `quotidien` « Vie quotidienne » : fiscalite, banque, alimentation, meteorologie, sante, travail
  - `pratiques` « Arts et pratiques » : theorie-musicale, escalade
- [ ] **Step 4 :** la carte n'affiche une zone de discipline que si elle a au moins une fiche après filtrage *(choix : 20 zones dont plusieurs vides noient la carte)* — test `masque une discipline sans fiche`. Lint, tests, build ; commit `Regrouper les disciplines par famille sur la carte`.

### Task 6 : Motifs transversaux

**Files :** Create : `lib/content/motifs.ts`, `lib/content/motifs.test.ts`, `app/motifs/page.tsx`, `app/motifs/[slug]/page.tsx`, `content/motifs/positif-et-negatif.md`, `content/motifs/normal-et-naturel.md`, `content/motifs/taux-et-niveau.md` ; Modify : `lib/content/schema.ts`, `lib/content/fiches.ts`, `components/navigation.tsx`, `app/fiches/[slug]/page.tsx` (lien vers chaque motif de la fiche), `app/sitemap.ts`, `scripts/coherence.ts`, `content/contribuer.md`

**Interfaces :**
- Produces : `export type MotifMeta = { slug: string; nom: string; resume: string; cree: Date; modifie: Date }`, `Motif = MotifMeta & { corps: string }` ; `getMotifs(dossier?, taxonomies?): Motif[]` trié par `nom` ; `getMotif(slug, dossier?, taxonomies?): Motif | null` ; `FicheMeta.motifs: string[]` (absent → `[]`) ; `creerSchemaFiche(taxonomies, chantiers, motifs: MotifMeta[] = [])`.
- Consumes : modèle de `lib/content/chantiers.ts` (même lecture, même message d'erreur de schéma).

- [ ] **Step 1 : tests** — `getMotifs` lit et trie ; `refuse un motif au front-matter invalide` ; fiche : `refuse un motif inconnu` (message : `motif inconnu « x » — aucun fichier content/motifs/x.md`) ; `refuse un motif répété dans la même fiche`. Cohérence : `avertit un motif relié à moins de deux fiches`, `avertit un motif dont toutes les fiches sont d’une seule discipline` (sinon c'est un chantier).
- [ ] **Step 2 :** implémenter ; pages statiques (`dynamicParams = false`) ; `/motifs/<slug>` affiche nom, résumé, corps, puis la liste des fiches reliées (terme, discipline, résumé) ; ajouter motifs au sitemap.
- [ ] **Step 3 : contenu** — trois motifs, corps au plan des fiches (« Le piège », « Où on le retrouve », « Ce qu’on peut en tirer »), et `motifs:` dans les fiches :
  - `positif-et-negatif` : retroaction-positive-systemique, renforcement-negatif-psychologie, erreur-de-type-statistiques, croissance-negative-economie, discrimination-positive-droit
  - `normal-et-naturel` : normal-philosophie, loi-normale-statistiques, naturel-philosophie, sophisme-naturaliste-philosophie
  - `taux-et-niveau` : inflation-baisse-economie, croissance-negative-economie, tranche-imposition-fiscalite
- [ ] **Step 4 :** `normal-et-naturel` a deux fiches de philosophie et une de statistiques : vérifier que l'avertissement « une seule discipline » ne se déclenche pas. Lint, tests, build ; commit `Ajouter les motifs transversaux`.

### Task 7 : Accroche et page d'accueil

**Files :** Modify : `lib/content/schema.ts`, `lib/content/fiches.ts` (`getIndex` porte `accroche` et `preuve`), `app/page.tsx`, 8 à 12 fiches ; Create : `lib/accueil.ts`, `lib/accueil.test.ts`

**Interfaces :** Produces `FicheMeta.accroche?: string` (1 à 140 caractères après `trim`) ; `export function fichesALaUne(index: FicheIndex[], nombre = 3): FicheIndex[]`.

- [ ] **Step 1 : tests** — schéma : `refuse une accroche de plus de 140 caractères`. `fichesALaUne` : `ne retient que les fiches avec accroche`, `met mesuree avant documentee avant intuition`, `départage par terme en ordre français`, `rend au plus 3`, `rend [] sans accroche`.
- [ ] **Step 2 :** implémenter. Accueil : intro et compteurs inchangés ; section « Le saviez-vous ? » (cartes : accroche en grand, terme, lien vers la fiche) ; lien « Les pièges qui reviennent d’une discipline à l’autre » vers `/motifs`. Le bouton « Proposer un terme » est ajouté par la tâche 10, avec la page qu'il vise.
- [ ] **Step 3 : contenu** — accroches factuelles, tirées uniquement du texte de chaque fiche, pour : risque-de-pluie, inflation-baisse, tranche-imposition, consommer-de-preference, significatif-statistiques, intervalle-de-confiance, dominant-biologie, schizophrenie-medecine, imaginaire-mathematiques, male-alpha-biologie.
- [ ] **Step 4 :** lint, tests, build ; commit `Mettre des fiches à la une sur l’accueil`.

### Task 8 : Image de partage par fiche

**Files :** Create : `app/fiches/[slug]/opengraph-image.tsx`, `app/fiches/[slug]/opengraph-image.test.tsx` (si le guide Next permet de tester le composant d'image ; sinon un test sur une fonction pure `contenuImagePartage(fiche, nomDiscipline)` dans `lib/partage.ts`)

**Interfaces :** Produces `contenuImagePartage(fiche: FicheMeta, nomDiscipline: string): { titre: string; phrase: string; pied: string }` — `phrase` = accroche si présente, sinon résumé.

- [ ] **Step 1 :** lire `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`.
- [ ] **Step 2 : test** de `contenuImagePartage` : accroche prioritaire, sinon résumé ; `pied` = `Simplistique · <discipline>`.
- [ ] **Step 3 :** implémenter l'image 1200×630 (fond clair, terme en grand, phrase, pied) avec `generateStaticParams` identique à la page de fiche ; police système, aucun chargement réseau au build.
- [ ] **Step 4 :** `npm run build` liste une image par fiche ; commit `Générer une image de partage par fiche`.

### Task 9 : Propositions — domaine, dépôt, API, migrations

**Files :**
- Create : `migrations/002-propositions.sql`, `lib/propositions/validation.ts`, `lib/propositions/depot.ts`, `lib/propositions/depot-postgres.ts`, `lib/propositions/service.ts`, `app/api/propositions/route.ts`, tests `.test.ts` à côté de chacun
- Modify : `lib/votes/migration.ts` et `scripts/migrer.ts` (appliquer tous les `migrations/*.sql` dans l'ordre alphabétique, puis vérifier `vote_unique` et l'existence des tables `propositions` et `reponses_quiz`), `lib/votes/migration.test.ts`

**Interfaces :**
- Produces :
  - `export type Proposition = { terme: string; discipline: string; pourquoi: string; suggestion: string; contact: string }`
  - `export function validerProposition(corps: unknown): { ok: true; proposition: Proposition } | { ok: false; erreur: 'invalide'; champs: string[] } | { ok: true; piege: true }` — chaînes `trim`ées, champs facultatifs absents → `''`.
  - `interface DepotDePropositions { ajouter(p: Proposition, auteur: string): Promise<void>; nombreDepuis(auteur: string, depuis: Date): Promise<number>; nonTraitees(): Promise<(Proposition & { id: number; creeLe: Date })[]>; marquerTraitee(id: number): Promise<'traitee' | 'absente'> }`, `depotEnMemoire()`, `depotPostgres(executeur)`
  - `export const LIMITE_PROPOSITIONS_PAR_HEURE = 5` ; `soumettre(depot, corps, auteur): Promise<{ type: 'ok' } | { type: 'invalide'; champs: string[] } | { type: 'trop' }>`
  - `POST /api/propositions` : 201 ok, 400 invalide (`{ erreur: 'invalide', champs }`), 429 trop, 403 origine, 503 indisponible.
- Consumes : `configurationVotes`, `empreinteVotant`, `adresseDeLEnTete`, `executeurNeon`.

- [ ] **Step 1 : tests de validation** — `exige terme et pourquoi`, `refuse pourquoi de moins de 20 caractères`, `refuse chaque champ au-delà de sa limite (120/80/2000/200/200)`, `ignore les clés inconnues sans échouer`, `champ site rempli → piege`, `corps non objet → invalide`.
- [ ] **Step 2 : tests du service** — `enregistre une proposition valide`, `n’écrit rien pour un piège mais répond ok`, `refuse la 6e proposition dans l’heure`, `la limite est par auteur`.
- [ ] **Step 3 : tests de la route** (dépôt en mémoire injecté comme le fait `app/api/votes/route.test.ts`) — 403 si `sec-fetch-site: cross-site`, 400 corps non JSON, 503 sans configuration, 201 nominal, en-tête `cache-control: private, no-store`.
- [ ] **Step 4 :** migration `002-propositions.sql` : table `propositions (id bigint identity pk, terme, discipline, pourquoi, suggestion, contact text not null default '', auteur text not null, cree_le timestamptz default now(), traitee_le timestamptz)` + index `(auteur, cree_le)` ; `003-reponses-quiz.sql` est créé par la tâche 11 mais le runner doit déjà gérer plusieurs fichiers — test `instructionsDeToutesLesMigrations lit les fichiers dans l’ordre`.
- [ ] **Step 5 :** implémenter ; tests verts ; build ; commit `Recevoir des propositions de termes sans compte GitHub`.

### Task 10 : Page `/proposer` et modération

**Files :** Create : `app/proposer/page.tsx`, `components/formulaire-proposition.tsx`, `components/formulaire-proposition.test.tsx`, `scripts/propositions.ts` ; Modify : `package.json` (`"propositions": "tsx --env-file-if-exists=.env.local scripts/propositions.ts"`), `components/navigation.tsx` (lien « Proposer »), `app/page.tsx` (bouton), `content/contribuer.md`, `app/sitemap.ts`

- [ ] **Step 1 : tests du formulaire** — `envoie les champs saisis en JSON`, `affiche « Merci, ta proposition est arrivée » après 201`, `affiche les champs en erreur après 400`, `affiche « Trop de propositions d’un coup, réessaie dans une heure » après 429`, `affiche un message d’indisponibilité après 503 ou erreur réseau, sans perdre la saisie`, `le champ piège est hors écran et exclu de la tabulation`.
- [ ] **Step 2 :** implémenter. Textes de la page : une phrase d'invitation (« Un mot t’a déjà induit en erreur ? Raconte-nous. »), aide sous `pourquoi` (« Décris le malentendu : ce que tu as compris, et ce que le mot voulait dire »), mention de ce qui est enregistré.
- [ ] **Step 3 :** `scripts/propositions.ts` : sans argument, affiche les non traitées (id, date, terme, discipline, pourquoi, suggestion, contact) ; `--traiter <id>` marque traitée et dit si l'id existait. Même discipline de journalisation d'erreur que `scripts/migrer.ts`.
- [ ] **Step 4 :** `contribuer.md` : section « Proposer un terme en deux minutes » en tête (lien `/proposer`), GitHub restant la voie pour une fiche complète ; mettre à jour « Ce que ce site enregistre » (propositions : texte saisi, empreinte non réversible, date ; contact seulement si fourni).
- [ ] **Step 5 :** lint, tests, build ; commit `Ajouter la page Proposer un terme`.

### Task 11 : Quiz — schéma, domaine, API

**Files :** Create : `migrations/003-reponses-quiz.sql`, `lib/quiz/depot.ts`, `lib/quiz/depot-postgres.ts`, `lib/quiz/service.ts`, `app/api/quiz/route.ts`, tests ; Modify : `lib/content/schema.ts`

**Interfaces :**
- Produces :
  - `FicheMeta.quiz?: { question: string; reponses: { texte: string; juste: boolean }[]; explication: string }` — 2 à 5 réponses, exactement une juste, textes distincts après `normaliser`.
  - `interface DepotDeQuiz { repartition(fiche: string): Promise<Record<string, number>>; reponseDe(fiche: string, votant: string): Promise<string | null>; ajouter(fiche: string, reponse: string, votant: string): Promise<'ajoute' | 'deja'>; nombreDepuis(votant: string, depuis: Date): Promise<number> }`
  - `export const LIMITE_QUIZ_PAR_HEURE = 30`
  - `lireQuiz(depot, fiche, votant)` et `repondre(depot, fiche, empreinte, votant)` → `{ type: 'ok'; repartition: Record<string, number>; mienne: string | null } | { type: 'inconnu' } | { type: 'deja' } | { type: 'trop' }` ; `repartition` ne contient que les empreintes des réponses actuelles de la fiche.
  - `GET /api/quiz?fiche=<slug>`, `POST /api/quiz { fiche, reponse: <empreinte> }`.

- [ ] **Step 1 : tests de schéma** — `refuse un quiz sans réponse juste`, `refuse deux réponses justes`, `refuse une seule réponse`, `refuse six réponses`, `refuse deux réponses au même texte normalisé`, `refuse une clé inconnue`.
- [ ] **Step 2 : tests du service** — `refuse une fiche sans quiz` (inconnu), `refuse une empreinte qui n’est pas une réponse de la fiche`, `une seule réponse par votant` (deja), `limite par heure`, `ignore les empreintes inconnues dans la répartition` (réponse dont le texte a changé).
- [ ] **Step 3 : tests de route** — mêmes cas d'origine, de corps et de configuration que les votes.
- [ ] **Step 4 :** migration : `reponses_quiz (id, fiche, reponse, votant, cree_le, CONSTRAINT reponse_quiz_unique UNIQUE (fiche, votant))` + index `(votant, cree_le)` ; le runner vérifie aussi `reponse_quiz_unique`.
- [ ] **Step 5 :** implémenter ; tests verts ; commit `Enregistrer les réponses aux quiz`.

### Task 12 : Quiz — composant et contenu

**Files :** Create : `components/quiz.tsx`, `components/quiz.test.tsx` ; Modify : `app/fiches/[slug]/page.tsx` (quiz rendu **avant** la prose, pour qu'on réponde sans avoir lu l'explication *(choix)*), 6 fiches, `content/contribuer.md`

- [ ] **Step 1 : tests du composant** — `affiche la question et les réponses avant tout choix, sans dire laquelle est juste` ; `après un choix : marque la bonne réponse, la mienne, l’explication et le pourcentage de chaque réponse` ; `si GET dit que j’ai déjà répondu, affiche directement le résultat` ; `si l’API est indisponible, révèle quand même la bonne réponse et l’explication, sans pourcentages` ; `pourcentages arrondis à l’entier et absents tant que personne n’a répondu`.
- [ ] **Step 2 :** implémenter (modèle : `components/votes.tsx` pour la récupération et la garde de type des réponses).
- [ ] **Step 3 : contenu** — quiz de 3 ou 4 réponses, fidèles au texte de la fiche, pour : risque-de-pluie-meteorologie, inflation-baisse-economie, tranche-imposition-fiscalite, consommer-de-preference-alimentation, intervalle-de-confiance-statistiques, decouvert-autorise-banque. Les mauvaises réponses reprennent les interprétations fausses décrites dans la fiche.
- [ ] **Step 4 :** `contribuer.md` : documenter `quiz` et `accroche`, et compléter « Ce que ce site enregistre » (réponse choisie, empreinte, date).
- [ ] **Step 5 :** lint, tests, build ; commit `Ajouter des quiz « tu comprends quoi ? » sur les fiches du quotidien`.

### Task 13 : Vérification d'ensemble

- [ ] `npm run lint`, `npm run lint:content`, `npm run test:once`, `npm run build`, `npm run verifier:statique` passent.
- [ ] Lancer `npm run dev`, ouvrir `/`, `/fiches` (carte et liste), une fiche avec quiz, `/motifs`, `/proposer` : aucun message d'erreur en console ; sans `DATABASE_URL`, quiz et formulaire affichent leur message d'indisponibilité.
- [ ] Mettre à jour `README.md` si la liste des scripts y figure (`propositions`, migrations multiples).

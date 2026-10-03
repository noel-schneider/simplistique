# Simplistique v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publier un site statique en français qui présente le manifeste de la simplistique et un corpus de fiches d'analyse de termes, navigable par une carte « constellations » et un catalogue filtrable partageant la même adresse.

**Architecture:** Le contenu vit dans des fichiers markdown et YAML versionnés sous `content/`. Un seul module (`lib/content`) les lit, les valide avec Zod et expose des objets typés ; aucun composant d'affichage ne sait que la source est du markdown. Le filtrage est une fonction pure (`lib/filtrage.ts`) appelée par un composant client qui lit et écrit l'état dans l'URL. Tout est rendu statiquement au build : aucun code ne tourne à l'exécution.

**Tech Stack:** Next.js 16.3.8 (App Router), React 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3, Zod 4.6.5, gray-matter 4.0.3, js-yaml 5.4.2, unified 11 / remark-parse 11 / remark-rehype 11 / rehype-slug 6 / rehype-stringify 10, Vitest 5.0.3 + @testing-library/react 16.3.3 + jsdom 30, déploiement Vercel, CI GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-simplistique-design.md`

## Global Constraints

- Toute l'interface, tout le contenu et tous les identifiants visibles par l'utilisateur sont en **français**. Les slugs sont sans accent (`mathematiques`, `theorie-musicale`).
- Le code (noms de fonctions, de variables, de fichiers) est en français lui aussi, pour rester cohérent avec le domaine : `getFiches`, `filtrerFiches`, `chargerTaxonomies`. Exception : les conventions imposées par Next.js (`page.tsx`, `layout.tsx`, `generateStaticParams`, `not-found.tsx`).
- Node.js **22 ou plus** (exigé par Next 16). Versions de dépendances figées à l'identique de la liste Tech Stack, sans intervalle (`"next": "16.3.8"`, pas `"^16.3.8"`).
- Aucun slug de discipline ni de type de confusion n'est codé en dur hors de `content/taxonomies/*.yml`. Les trois statuts font exception, parce que leur taxonomie est fermée par la spec : ils vivent dans le type `Statut`, la constante `STATUTS` et les tables exhaustives de la forme `Record<Statut, …>`, et nulle part ailleurs.
- Aucune route ne consomme d'API dynamique de Next (`cookies()`, `headers()`, `connection()`). Chaque page doit être générée au build.
- Les trois statuts sont exactement `pointe`, `propose`, `rejete`. Les cinq types de confusion sont exactement `faux-ami-courant`, `polysemie-externe`, `paire-bancale`, `nom-historique`, `jargon-opaque`.
- `resume` : 240 caractères maximum. Dépassement = erreur de validation bloquante.
- La carte n'est jamais le seul chemin vers une fiche : chaque point est un `<a href>`.

## Review Focus

Classes d'entrées que la spec implique sans qu'aucune tâche ne les exerce spontanément. Chaque ligne a son test rattaché à la tâche qui possède le code.

1. **Deux fiches portant le même `terme` dans deux disciplines** — c'est le cas central du manifeste (le pont transdisciplinaire). Les slugs doivent rester distincts et les deux fiches doivent apparaître côte à côte sans écrasement. → test en Tâche 3 (unicité des slugs) et Tâche 5 (les deux ressortent d'une recherche sur le terme).
2. **Terme accentué, apostrophé ou à plusieurs mots** (`tempérament`, `nombre d'or`) — la recherche doit le trouver qu'on tape avec ou sans accent, et le slug doit rester une URL propre. → test en Tâche 5 (`normaliser`) et Tâche 3 (slug dérivé du nom de fichier, jamais du terme).
3. **`?q=` contenant des caractères spéciaux** (`<script>`, `*`, `(`) — la recherche se fait par inclusion de chaînes, jamais par expression régulière construite depuis la saisie, et React échappe l'affichage. Pas de plantage, pas d'injection. → test en Tâche 5.
4. **Paramètres d'URL inconnus ou vides** (`?discipline=klingon`, `?statut=`, `?vue=licorne`) — ignorés, le corpus complet s'affiche, et surtout pas une liste vide qui laisserait croire que le corpus est vide. → test en Tâche 5 (`analyserCriteres`) et Tâche 9 (`?vue` invalide retombe sur le défaut).
5. **Corpus vide, ou discipline sans aucune fiche** — la carte doit dessiner la zone avec « 0 fiche » sans SVG cassé ni division par zéro, et la liste filtrée à zéro résultat doit afficher un message explicite avec un moyen d'effacer les filtres. → test en Tâche 10 (discipline vide) et Tâche 9 (zéro résultat).

---

### Task 1: Échafaudage et outillage de test

Le dépôt contient déjà `.git`, `.gitignore` et `docs/`. `create-next-app` refuse de s'installer dans un dossier contenant des fichiers inconnus, donc on échafaude ailleurs puis on recopie.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (tous produits par `create-next-app`)
- Create: `vitest.config.mts`, `vitest.setup.ts`
- Create: `lib/exemple.ts`, `lib/exemple.test.ts` (sondes jetables, supprimées à l'étape 7)
- Modify: `package.json` (scripts, versions figées)

**Interfaces:**
- Consumes: rien.
- Produces: `npm test`, `npm run test:once`, `npm run build`, `npm run lint` fonctionnels. Alias d'import `@/` vers la racine du dépôt.

- [ ] **Step 1: Échafauder Next.js hors du dépôt puis recopier**

```bash
cd /tmp && rm -rf simplistique-echafaudage
npx create-next-app@16.3.8 simplistique-echafaudage \
  --typescript --tailwind --app --eslint \
  --no-src-dir --import-alias "@/*" --use-npm --yes
rsync -a --exclude '.git' --exclude '.gitignore' --exclude 'README.md' \
  /tmp/simplistique-echafaudage/ /Users/noel/Documents/simplistique/
cd /Users/noel/Documents/simplistique && rm -rf node_modules package-lock.json
```

- [ ] **Step 2: Figer les versions et ajouter les dépendances**

Deux gestes distincts, dans cet ordre.

**a. Figer ce que `create-next-app` a déjà installé.** Garder les versions qu'il a choisies, mais remplacer **tout intervalle par la version exacte réellement installée**, que `npm ls --depth=0` donne. Attention : `create-next-app` n'écrit pas `^20` mais `"20"`, qui est un intervalle (`>=20.0.0 <21.0.0`) tout autant qu'un `^` — il faut donc le remplacer aussi. Cela concerne `next`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint` et `eslint-config-next`.

Ne pas choisir soi-même la version d'`eslint` : un `eslint` fixé à la main risque un conflit de pairs avec `eslint-config-next`, et l'échafaudage a choisi un couple cohérent (eslint 9).

Une exception à « garder ce qu'il a choisi » : **`@types/node` passe à `26.6.4`**. L'échafaudage le fixe en 20.x, ce qui entre en conflit de pairs avec `vitest@5` et ne correspond pas au Node installé (26.x). Masquer ce conflit par un `.npmrc` (`legacy-peer-deps=true`) est interdit : ce réglage serait aussi lu par `npm ci` en intégration continue et éteindrait toutes les alertes de pairs du projet, y compris les vraies.

Vérifier ensuite que les versions obtenues correspondent à la pile annoncée en tête de plan, et signaler tout écart dans le rapport sans le corriger.

**b. Ajouter exactement ces dépendances,** aux versions indiquées, sans intervalle :

```bash
npm install --save-exact \
  zod@4.6.5 gray-matter@4.0.3 js-yaml@5.4.2 \
  unified@11.0.5 remark-parse@11.0.0 remark-rehype@11.1.2 \
  rehype-slug@6.0.0 rehype-stringify@10.0.1

npm install --save-exact --save-dev \
  @tailwindcss/typography@0.5.20 \
  vitest@5.0.3 @vitejs/plugin-react@6.1.1 \
  @testing-library/react@16.3.3 @testing-library/user-event@14.6.7 \
  @testing-library/jest-dom@7.0.1 jsdom@30.1.1 tsx@4.23.15
```

`js-yaml` embarque ses propres types (`dist/js-yaml.d.ts`) : ne pas installer `@types/js-yaml`, qui ne décrit que la version 4 et entrerait en conflit.

Si l'une de ces versions exactes n'existe plus au moment de l'exécution, prendre la plus proche version publiée de la même majeure, la figer sans intervalle, et noter l'écart dans le rapport et le message de commit.

Remplacer le champ `scripts` par :

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:once": "vitest run",
    "lint:content": "tsx scripts/lint-content.ts"
  }
```

Puis vérifier que l'arbre de dépendances est cohérent :

```bash
npm install
npm ls --depth=0
```

- [ ] **Step 3: Configurer Vitest**

Créer `vitest.config.mts` :

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{lib,components,app,scripts}/**/*.test.{ts,tsx}'],
  },
})
```

Créer `vitest.setup.ts` :

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Écrire un test qui échoue pour prouver que le harnais tourne**

Créer `lib/exemple.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { doubler } from './exemple'

describe('doubler', () => {
  it('double un nombre', () => {
    expect(doubler(21)).toBe(42)
  })
})
```

- [ ] **Step 5: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once`
Expected: FAIL — `Failed to resolve import "./exemple"`

- [ ] **Step 6: Écrire l'implémentation minimale et vérifier que le test passe**

Créer `lib/exemple.ts` :

```ts
export function doubler(n: number): number {
  return n * 2
}
```

Run: `npm run test:once`
Expected: PASS — 1 test réussi

- [ ] **Step 7: Retirer les sondes et vérifier que le build passe**

```bash
rm lib/exemple.ts lib/exemple.test.ts
npm run build
```
Expected: le build réussit et génère `/` en statique.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: échafaudage Next.js 16, Tailwind 4 et Vitest 5"
```

---

### Task 2: Taxonomies

**Files:**
- Create: `content/taxonomies/disciplines.yml`, `content/taxonomies/confusions.yml`, `content/taxonomies/statuts.yml`
- Create: `lib/content/schema.ts`
- Create: `lib/content/taxonomies.ts`
- Test: `lib/content/taxonomies.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces :

```ts
// lib/content/schema.ts
export type Statut = 'pointe' | 'propose' | 'rejete'
export const STATUTS: readonly Statut[]
export type EntreeTaxonomie = { slug: string; nom: string; description: string }
export type Discipline = EntreeTaxonomie & { couleur: string }
export type Taxonomies = {
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}

// lib/content/taxonomies.ts
export const DOSSIER_CONTENU: string            // <racine du dépôt>/content
export function chargerTaxonomies(dossier?: string): Taxonomies
```

`chargerTaxonomies` lève une erreur explicite (message contenant le nom du fichier et le slug fautif) si une entrée est mal formée, si un slug est dupliqué dans un même fichier, ou si `statuts.yml` ne contient pas exactement les trois statuts attendus.

**Écart assumé par rapport à la spec §3.4 :** les entrées de `disciplines.yml` portent un champ `couleur` en plus de `{slug, nom, description}`. La spec §5.3 exige que la couleur encode la discipline ; `disciplines.yml` est le seul endroit cohérent pour la stocker, sinon elle finirait codée en dur dans un composant, ce que la contrainte globale interdit.

- [ ] **Step 1: Écrire les trois fichiers de taxonomie**

`content/taxonomies/statuts.yml` :

```yaml
- slug: pointe
  nom: Pointé
  description: >
    Problème de clarté identifié, sans alternative proposée. Il n'existe pas
    toujours de meilleur mot disponible.
- slug: propose
  nom: Proposé
  description: >
    Une ou plusieurs formulations alternatives sont suggérées, avec leurs
    risques.
- slug: rejete
  nom: Rejeté
  description: >
    Analyse menée jusqu'au bout, conclusion : ne rien changer. Le coût du
    changement dépasse le gain de clarté.
```

`content/taxonomies/confusions.yml` :

```yaml
- slug: faux-ami-courant
  nom: Faux ami courant
  description: >
    Un mot du langage ordinaire dont le sens technique n'a aucun rapport avec
    le sens commun. Le lecteur croit comprendre, et c'est pire que de ne pas
    comprendre.
- slug: polysemie-externe
  nom: Polysémie externe
  description: >
    Le même mot désigne des concepts sans rapport, parfois dans la même phrase.
- slug: paire-bancale
  nom: Paire bancale
  description: >
    Deux termes présentés comme opposés alors qu'ils n'opposent rien de clair.
- slug: nom-historique
  nom: Nom historique
  description: >
    Un nom hérité d'une personne, d'un lieu ou d'une époque, qui n'évoque pas
    la chose qu'il désigne.
- slug: jargon-opaque
  nom: Jargon opaque
  description: >
    La forme du mot n'offre aucune prise pour deviner le sens, même de loin.
```

`content/taxonomies/disciplines.yml` :

```yaml
- slug: mathematiques
  nom: Mathématiques
  couleur: '#e8703a'
  description: >
    Discipline ancienne et très stable, donc terrain privilégié de la
    simplistique : ses concepts ne bougent plus guère.
- slug: comptabilite
  nom: Comptabilité
  couleur: '#3b82c4'
  description: >
    Vocabulaire quotidien de millions de personnes, bâti sur des mots courants
    détournés de leur sens.
- slug: theorie-musicale
  nom: Théorie musicale
  couleur: '#9a6fd4'
  description: >
    Terminologie sédimentée sur des siècles, avec des couches de vocabulaire
    qui se contredisent.
- slug: escalade
  nom: Escalade
  couleur: '#3fa08a'
  description: >
    Discipline jeune au jargon encore mouvant, où les termes se fixent en ce
    moment même.
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `lib/content/taxonomies.test.ts` :

```ts
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

function dossierFactice(fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), 'simplistique-'))
  mkdirSync(join(racine, 'taxonomies'))
  for (const [nom, contenu] of Object.entries(fichiers)) {
    writeFileSync(join(racine, 'taxonomies', nom), contenu, 'utf8')
  }
  return racine
}

const STATUTS_VALIDES = `
- { slug: pointe, nom: Pointé, description: a }
- { slug: propose, nom: Proposé, description: b }
- { slug: rejete, nom: Rejeté, description: c }
`
const CONFUSIONS_VALIDES = `
- { slug: faux-ami-courant, nom: Faux ami, description: d }
`
const DISCIPLINES_VALIDES = `
- { slug: mathematiques, nom: Mathématiques, couleur: '#e8703a', description: e }
`

describe('chargerTaxonomies', () => {
  it('charge les trois taxonomies réelles du dépôt', () => {
    const t = chargerTaxonomies(DOSSIER_CONTENU)
    expect(t.statuts.map((s) => s.slug)).toEqual(['pointe', 'propose', 'rejete'])
    expect(t.disciplines.map((d) => d.slug)).toContain('theorie-musicale')
    expect(t.confusions).toHaveLength(5)
  })

  it('donne une couleur à chaque discipline réelle', () => {
    for (const d of chargerTaxonomies(DOSSIER_CONTENU).disciplines) {
      expect(d.couleur).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('refuse un slug dupliqué en nommant le fautif', () => {
    const racine = dossierFactice({
      'statuts.yml': STATUTS_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `
- { slug: escalade, nom: Escalade, couleur: '#3fa08a', description: a }
- { slug: escalade, nom: Grimpe, couleur: '#3fa08a', description: b }
`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/escalade/)
  })

  it('refuse une entrée sans description', () => {
    const racine = dossierFactice({
      'statuts.yml': STATUTS_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, couleur: '#3fa08a' }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/disciplines\.yml/)
  })

  it('refuse une couleur qui n\'est pas hexadécimale', () => {
    const racine = dossierFactice({
      'statuts.yml': STATUTS_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, couleur: turquoise, description: a }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/couleur/)
  })

  it('refuse une taxonomie de statuts qui ne contient pas les trois attendus', () => {
    const racine = dossierFactice({
      'statuts.yml': `- { slug: pointe, nom: Pointé, description: a }`,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': DISCIPLINES_VALIDES,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/statuts/)
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/content/taxonomies.test.ts`
Expected: FAIL — `Failed to resolve import "./taxonomies"`

- [ ] **Step 4: Écrire `lib/content/schema.ts`**

```ts
import { z } from 'zod'

export type Statut = 'pointe' | 'propose' | 'rejete'
export const STATUTS = ['pointe', 'propose', 'rejete'] as const satisfies readonly Statut[]

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide : minuscules, chiffres et tirets uniquement')

export const schemaEntreeTaxonomie = z.object({
  slug,
  nom: z.string().min(1),
  description: z.string().min(1),
})

export const schemaDiscipline = schemaEntreeTaxonomie.extend({
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur invalide : hexadécimal sur 6 chiffres'),
})

export type EntreeTaxonomie = z.infer<typeof schemaEntreeTaxonomie>
export type Discipline = z.infer<typeof schemaDiscipline>

export type Taxonomies = {
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}
```

- [ ] **Step 5: Écrire `lib/content/taxonomies.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'js-yaml'
import type { ZodType } from 'zod'
import {
  schemaDiscipline,
  schemaEntreeTaxonomie,
  STATUTS,
  type Discipline,
  type EntreeTaxonomie,
  type Taxonomies,
} from './schema'

export const DOSSIER_CONTENU = join(process.cwd(), 'content')

function chargerListe<T extends { slug: string }>(
  dossier: string,
  fichier: string,
  schema: ZodType<T>,
): T[] {
  const chemin = join(dossier, 'taxonomies', fichier)
  const brut = load(readFileSync(chemin, 'utf8'))

  if (!Array.isArray(brut)) {
    throw new Error(`${fichier} : le fichier doit contenir une liste d'entrées`)
  }

  const entrees = brut.map((entree, i) => {
    const resultat = schema.safeParse(entree)
    if (!resultat.success) {
      const details = resultat.error.issues
        .map((p) => `${p.path.join('.') || '(racine)'} : ${p.message}`)
        .join(' ; ')
      throw new Error(`${fichier}, entrée ${i + 1} : ${details}`)
    }
    return resultat.data
  })

  const vus = new Set<string>()
  for (const entree of entrees) {
    if (vus.has(entree.slug)) {
      throw new Error(`${fichier} : slug dupliqué « ${entree.slug} »`)
    }
    vus.add(entree.slug)
  }

  return entrees
}

export function chargerTaxonomies(dossier: string = DOSSIER_CONTENU): Taxonomies {
  const disciplines = chargerListe<Discipline>(dossier, 'disciplines.yml', schemaDiscipline)
  const confusions = chargerListe<EntreeTaxonomie>(dossier, 'confusions.yml', schemaEntreeTaxonomie)
  const statuts = chargerListe<EntreeTaxonomie>(dossier, 'statuts.yml', schemaEntreeTaxonomie)

  const attendus = [...STATUTS].sort().join(',')
  const trouves = statuts.map((s) => s.slug).sort().join(',')
  if (attendus !== trouves) {
    throw new Error(`statuts.yml : doit contenir exactement ${attendus}, trouvé ${trouves || '(rien)'}`)
  }

  if (disciplines.length === 0) throw new Error('disciplines.yml : au moins une discipline est requise')
  if (confusions.length === 0) throw new Error('confusions.yml : au moins un type de confusion est requis')

  return { disciplines, confusions, statuts }
}
```

- [ ] **Step 6: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once lib/content/taxonomies.test.ts`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 7: Commit**

```bash
git add content/taxonomies lib/content
git commit -m "feat: taxonomies disciplines, confusions et statuts validées par Zod"
```

---

### Task 3: Schéma de fiche et lecture du contenu

**Files:**
- Create: `content/fiches/groupe-mathematiques.md`, `content/fiches/actif-comptabilite.md`, `content/fiches/passif-comptabilite.md`, `content/fiches/statique-escalade.md`, `content/fiches/mesure-theorie-musicale.md` (contenus intégraux en Annexe B)
- Modify: `lib/content/schema.ts` (ajout du schéma de fiche)
- Create: `lib/content/fiches.ts`
- Test: `lib/content/fiches.test.ts`

**Interfaces:**
- Consumes: `chargerTaxonomies`, `DOSSIER_CONTENU`, `schemaDiscipline`, `STATUTS` (Tâche 2).
- Produces :

```ts
// lib/content/schema.ts
export type FicheMeta = {
  slug: string
  terme: string
  discipline: string
  confusion: string
  statut: Statut
  resume: string
  suggestions: string[]
  cree: Date
  modifie: Date
}
export type Fiche = FicheMeta & { corps: string }   // corps = markdown brut
export function creerSchemaFiche(taxonomies: Taxonomies): ZodType<Omit<FicheMeta, 'slug'>>

// lib/content/fiches.ts
export function getFiches(dossier?: string, taxonomies?: Taxonomies): Fiche[]  // triées par terme, locale fr
export function getFiche(slug: string, dossier?: string, taxonomies?: Taxonomies): Fiche | null
export function getDocument(nom: 'manifeste' | 'contribuer', dossier?: string): string
```

Le `slug` vient **du nom de fichier**, jamais du `terme` : un terme accentué ou à plusieurs mots ne doit pas produire d'URL douteuse, et deux disciplines peuvent analyser le même terme.

`js-yaml` convertit `cree: 2026-10-03` en objet `Date`. Le schéma utilise donc `z.coerce.date()`, qui accepte aussi bien la `Date` que la chaîne.

- [ ] **Step 1: Écrire les cinq fiches de départ**

Créer les cinq fichiers de `content/fiches/` avec le contenu intégral donné en **Annexe B**, sans le modifier.

- [ ] **Step 2: Écrire le test qui échoue**

Créer `lib/content/fiches.test.ts` :

```ts
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { getFiche, getFiches, getDocument } from './fiches'

const taxonomies = chargerTaxonomies(DOSSIER_CONTENU)

function corpusFactice(fiches: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), 'simplistique-fiches-'))
  mkdirSync(join(racine, 'fiches'))
  for (const [nom, contenu] of Object.entries(fiches)) {
    writeFileSync(join(racine, 'fiches', nom), contenu, 'utf8')
  }
  return racine
}

const VALIDE = `---
terme: groupe
discipline: mathematiques
confusion: faux-ami-courant
statut: pointe
resume: Un mot courant dont le sens technique n'a aucun rapport.
suggestions: []
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

Le corps.
`

describe('getFiches sur le corpus réel', () => {
  it('lit toutes les fiches du dépôt', () => {
    const fiches = getFiches(DOSSIER_CONTENU, taxonomies)
    expect(fiches.length).toBeGreaterThanOrEqual(5)
  })

  it('trie par terme selon l\'ordre alphabétique français', () => {
    const termes = getFiches(DOSSIER_CONTENU, taxonomies).map((f) => f.terme)
    const attendu = [...termes].sort((a, b) => a.localeCompare(b, 'fr'))
    expect(termes).toEqual(attendu)
  })

  it('donne un slug unique à chaque fiche', () => {
    const slugs = getFiches(DOSSIER_CONTENU, taxonomies).map((f) => f.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('garde distinctes deux fiches du même terme dans deux disciplines', () => {
    const racine = corpusFactice({
      'mesure-physique.md': VALIDE.replace('terme: groupe', 'terme: mesure'),
      'mesure-musique.md': VALIDE
        .replace('terme: groupe', 'terme: mesure')
        .replace('discipline: mathematiques', 'discipline: theorie-musicale'),
    })
    const fiches = getFiches(racine, taxonomies)
    expect(fiches).toHaveLength(2)
    expect(fiches.map((f) => f.slug).sort()).toEqual(['mesure-musique', 'mesure-physique'])
    expect(new Set(fiches.map((f) => f.discipline)).size).toBe(2)
  })

  it('dérive le slug du nom de fichier, pas du terme', () => {
    const racine = corpusFactice({
      'nombre-d-or-mathematiques.md': VALIDE.replace('terme: groupe', `terme: nombre d'or`),
    })
    expect(getFiches(racine, taxonomies)[0].slug).toBe('nombre-d-or-mathematiques')
  })

  it('convertit les dates du front-matter en objets Date', () => {
    const fiche = getFiches(corpusFactice({ 'x-mathematiques.md': VALIDE }), taxonomies)[0]
    expect(fiche.cree).toBeInstanceOf(Date)
    expect(fiche.cree.getUTCFullYear()).toBe(2026)
  })

  it('conserve le corps markdown brut', () => {
    const fiche = getFiches(corpusFactice({ 'x-mathematiques.md': VALIDE }), taxonomies)[0]
    expect(fiche.corps).toContain('## Pourquoi c\'est confus')
  })
})

describe('getFiches refuse le contenu invalide', () => {
  it('refuse une discipline absente de la taxonomie', () => {
    const racine = corpusFactice({
      'x-klingon.md': VALIDE.replace('discipline: mathematiques', 'discipline: klingon'),
    })
    expect(() => getFiches(racine, taxonomies)).toThrow(/klingon/)
  })

  it('refuse un statut inconnu', () => {
    const racine = corpusFactice({ 'x-mathematiques.md': VALIDE.replace('statut: pointe', 'statut: peut-etre') })
    expect(() => getFiches(racine, taxonomies)).toThrow(/statut/)
  })

  it('refuse une fiche sans resume, en nommant le fichier', () => {
    const racine = corpusFactice({
      'x-mathematiques.md': VALIDE.replace(
        "resume: Un mot courant dont le sens technique n'a aucun rapport.\n",
        '',
      ),
    })
    expect(() => getFiches(racine, taxonomies)).toThrow(/x-mathematiques\.md/)
  })

  it('refuse un resume de plus de 240 caractères', () => {
    const racine = corpusFactice({
      'x-mathematiques.md': VALIDE.replace(
        "Un mot courant dont le sens technique n'a aucun rapport.",
        'a'.repeat(241),
      ),
    })
    expect(() => getFiches(racine, taxonomies)).toThrow(/resume/)
  })

  it('refuse suggestions en chaîne au lieu de tableau', () => {
    const racine = corpusFactice({ 'x-mathematiques.md': VALIDE.replace('suggestions: []', 'suggestions: avoir') })
    expect(() => getFiches(racine, taxonomies)).toThrow(/suggestions/)
  })
})

describe('getFiche', () => {
  it('retrouve une fiche réelle par son slug', () => {
    expect(getFiche('groupe-mathematiques', DOSSIER_CONTENU, taxonomies)?.terme).toBe('groupe')
  })

  it('rend null pour un slug inconnu', () => {
    expect(getFiche('licorne-maths', DOSSIER_CONTENU, taxonomies)).toBeNull()
  })
})

describe('getDocument', () => {
  it('lit le manifeste', () => {
    expect(getDocument('manifeste', DOSSIER_CONTENU).length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/content/fiches.test.ts`
Expected: FAIL — `Failed to resolve import "./fiches"`

- [ ] **Step 4: Ajouter le schéma de fiche à `lib/content/schema.ts`**

Ajouter en bas du fichier :

```ts
export type FicheMeta = {
  slug: string
  terme: string
  discipline: string
  confusion: string
  statut: Statut
  resume: string
  suggestions: string[]
  cree: Date
  modifie: Date
}

export type Fiche = FicheMeta & { corps: string }

export const LONGUEUR_MAX_RESUME = 240

export function creerSchemaFiche(taxonomies: Taxonomies) {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]
  const confusions = taxonomies.confusions.map((c) => c.slug) as [string, ...string[]]

  return z.object({
    terme: z.string().min(1),
    discipline: z.enum(disciplines),
    confusion: z.enum(confusions),
    statut: z.enum(STATUTS),
    resume: z.string().min(1).max(LONGUEUR_MAX_RESUME),
    suggestions: z.array(z.string().min(1)),
    cree: z.coerce.date(),
    modifie: z.coerce.date(),
  })
}
```

Le `z.enum` bâti depuis la taxonomie fait que le message d'erreur cite les valeurs acceptées et la valeur fautive, ce dont dépendent les tests.

- [ ] **Step 5: Écrire `lib/content/fiches.ts`**

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { creerSchemaFiche, type Fiche, type Taxonomies } from './schema'

export { DOSSIER_CONTENU }

function lireFiche(dossier: string, fichier: string, taxonomies: Taxonomies): Fiche {
  const chemin = join(dossier, 'fiches', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaFiche(taxonomies).safeParse(data)

  if (!resultat.success) {
    const champs = data as Record<string, unknown>
    const details = resultat.error.issues
      .map((probleme) => {
        const champ = probleme.path.join('.') || '(racine)'
        const recu = probleme.path.length > 0 ? champs[String(probleme.path[0])] : undefined
        return recu === undefined
          ? `${champ} : ${probleme.message}`
          : `${champ} : ${probleme.message} (valeur reçue : ${JSON.stringify(recu)})`
      })
      .join(' ; ')
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug: fichier.replace(/\.md$/, ''), ...resultat.data, corps: content }
}

export function getFiches(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Fiche[] {
  const dossierFiches = join(dossier, 'fiches')
  if (!existsSync(dossierFiches)) return []

  return readdirSync(dossierFiches)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireFiche(dossier, f, taxonomies))
    .sort((a, b) => a.terme.localeCompare(b.terme, 'fr'))
}

export function getFiche(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Fiche | null {
  return getFiches(dossier, taxonomies).find((f) => f.slug === slug) ?? null
}

export function getDocument(
  nom: 'manifeste' | 'contribuer',
  dossier: string = DOSSIER_CONTENU,
): string {
  return readFileSync(join(dossier, `${nom}.md`), 'utf8')
}
```

- [ ] **Step 6: Créer les deux documents attendus par `getDocument`**

Créer `content/manifeste.md` avec le contenu intégral de l'**Annexe A** et `content/contribuer.md` avec celui de l'**Annexe C**.

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once lib/content`
Expected: PASS — l'ensemble des tests des tâches 2 et 3 réussit

- [ ] **Step 8: Commit**

```bash
git add content lib/content
git commit -m "feat: lecture et validation des fiches markdown"
```

---

### Task 4: Rendu markdown

**Files:**
- Create: `lib/content/markdown.ts`
- Test: `lib/content/markdown.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces :

```ts
export function retirerCrochets(texte: string): string          // [[mot]] -> mot
export async function rendreMarkdown(markdown: string): Promise<string>  // -> HTML
export function listerTitres(markdown: string): string[]        // titres de niveau 2, texte brut
```

`retirerCrochets` s'applique **avant** le rendu, donc le HTML produit ne contient jamais de crochets doubles. `listerTitres` lit la source markdown (pas le HTML) pour que `scripts/lint-content.ts` puisse vérifier la présence de `## Risques` sans rendre la page.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `lib/content/markdown.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { listerTitres, rendreMarkdown, retirerCrochets } from './markdown'

describe('retirerCrochets', () => {
  it('retire les crochets doubles en gardant le mot', () => {
    expect(retirerCrochets('un frein à la [[clarté]] du propos')).toBe('un frein à la clarté du propos')
  })

  it('garde la partie affichée d\'un lien à barre verticale', () => {
    expect(retirerCrochets('pas très [[Intuitivité|intuitif]]')).toBe('pas très intuitif')
  })

  it('laisse intact un texte sans crochets', () => {
    expect(retirerCrochets('rien à signaler')).toBe('rien à signaler')
  })
})

describe('rendreMarkdown', () => {
  it('rend les titres avec un identifiant ancrable', async () => {
    const html = await rendreMarkdown('## Pourquoi c\'est confus')
    expect(html).toMatch(/<h2 id="[^"]+">/)
    expect(html).toMatch(/Pourquoi c.{1,8}est confus/)
  })

  it('ne laisse aucun crochet double dans le HTML', async () => {
    const html = await rendreMarkdown('Un frein à la [[clarté]].')
    expect(html).not.toContain('[[')
    expect(html).toContain('clarté')
  })

  it('échappe le HTML brut présent dans la source', async () => {
    const html = await rendreMarkdown('Attention <script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })

  it('rend les listes et l\'emphase', async () => {
    const html = await rendreMarkdown('- un *mot*\n- deux')
    expect(html).toContain('<li>')
    expect(html).toContain('<em>mot</em>')
  })
})

describe('listerTitres', () => {
  it('liste les titres de niveau 2 dans l\'ordre', () => {
    const md = '# Titre\n\n## Pourquoi c\'est confus\n\ntexte\n\n## Risques\n\ntexte'
    expect(listerTitres(md)).toEqual(["Pourquoi c'est confus", 'Risques'])
  })

  it('ignore un ## à l\'intérieur d\'un bloc de code', () => {
    const md = '## Vrai titre\n\n```\n## faux titre\n```\n'
    expect(listerTitres(md)).toEqual(['Vrai titre'])
  })

  it('rend une liste vide quand il n\'y a aucun titre', () => {
    expect(listerTitres('juste du texte')).toEqual([])
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/content/markdown.test.ts`
Expected: FAIL — `Failed to resolve import "./markdown"`

- [ ] **Step 3: Écrire `lib/content/markdown.ts`**

```ts
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const CROCHETS = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function retirerCrochets(texte: string): string {
  return texte.replace(CROCHETS, (_, cible: string, affiche?: string) => (affiche ?? cible).trim())
}

const processeur = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeStringify)

export async function rendreMarkdown(markdown: string): Promise<string> {
  const fichier = await processeur.process(retirerCrochets(markdown))
  return String(fichier)
}

export function listerTitres(markdown: string): string[] {
  const titres: string[] = []
  let dansUnBlocDeCode = false

  for (const ligne of markdown.split('\n')) {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBlocDeCode = !dansUnBlocDeCode
      continue
    }
    if (dansUnBlocDeCode) continue

    const correspondance = /^##\s+(.*\S)\s*$/.exec(ligne)
    if (correspondance) titres.push(retirerCrochets(correspondance[1]))
  }

  return titres
}
```

`remark-rehype` sans `allowDangerousHtml` écarte le HTML brut de la source, ce qui satisfait le test d'échappement.

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once lib/content/markdown.test.ts`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 5: Commit**

```bash
git add lib/content/markdown.ts lib/content/markdown.test.ts
git commit -m "feat: rendu markdown, crochets doubles aplatis en texte"
```

---

### Task 5: Index et filtrage

**Files:**
- Modify: `lib/content/fiches.ts` (ajout de `getIndex`)
- Modify: `lib/content/schema.ts` (ajout du type `FicheIndex`)
- Create: `lib/filtrage.ts`
- Test: `lib/filtrage.test.ts`
- Test: `lib/content/index.test.ts`

**Interfaces:**
- Consumes: `getFiches`, `Fiche`, `Statut`, `Taxonomies` (Tâches 2 et 3).
- Produces :

```ts
// lib/content/schema.ts
export type FicheIndex = {
  slug: string
  terme: string
  discipline: string
  confusion: string
  statut: Statut
  resume: string
  suggestions: string[]
}

// lib/content/fiches.ts
export function getIndex(dossier?: string, taxonomies?: Taxonomies): FicheIndex[]

// lib/filtrage.ts
export type Criteres = { disciplines: string[]; confusions: string[]; statuts: string[]; q: string }
export type SlugsValides = { disciplines: string[]; confusions: string[]; statuts: string[] }
export const CRITERES_VIDES: Criteres
export function normaliser(texte: string): string
export function analyserCriteres(params: URLSearchParams, valides: SlugsValides): Criteres
export function ecrireCriteres(criteres: Criteres, vue?: 'carte' | 'liste'): string  // querystring sans « ? »
export function filtrerFiches(index: FicheIndex[], criteres: Criteres): FicheIndex[]
export function aUnFiltre(criteres: Criteres): boolean
```

`FicheIndex` ne porte pas les dates : c'est le seul objet traversé jusqu'au navigateur, autant qu'il reste minimal. `analyserCriteres` reçoit la liste des slugs valides en argument pour que `lib/filtrage.ts` ne lise jamais le disque et reste utilisable dans un composant client.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `lib/content/index.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { getIndex } from './fiches'
import { DOSSIER_CONTENU } from './taxonomies'

describe('getIndex', () => {
  const index = getIndex(DOSSIER_CONTENU)

  it('expose une entrée par fiche', () => {
    expect(index.length).toBeGreaterThanOrEqual(5)
  })

  it('n\'expose ni corps ni dates', () => {
    for (const entree of index) {
      expect(entree).not.toHaveProperty('corps')
      expect(entree).not.toHaveProperty('cree')
      expect(entree).not.toHaveProperty('modifie')
    }
  })

  it('expose exactement les champs attendus', () => {
    expect(Object.keys(index[0]).sort()).toEqual(
      ['confusion', 'discipline', 'resume', 'slug', 'statut', 'suggestions', 'terme'],
    )
  })

  it('est sérialisable en JSON sans perte', () => {
    expect(JSON.parse(JSON.stringify(index))).toEqual(index)
  })
})
```

Créer `lib/filtrage.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { FicheIndex } from './content/schema'
import {
  analyserCriteres,
  aUnFiltre,
  CRITERES_VIDES,
  ecrireCriteres,
  filtrerFiches,
  normaliser,
  type SlugsValides,
} from './filtrage'

const valides: SlugsValides = {
  disciplines: ['mathematiques', 'comptabilite', 'theorie-musicale', 'escalade'],
  confusions: ['faux-ami-courant', 'polysemie-externe'],
  statuts: ['pointe', 'propose', 'rejete'],
}

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const CORPUS: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', resume: 'structure algébrique' }),
  fiche({ slug: 'actif-comptabilite', terme: 'actif', discipline: 'comptabilite', statut: 'propose', suggestions: ['avoir'] }),
  fiche({ slug: 'temperament-theorie-musicale', terme: 'tempérament', discipline: 'theorie-musicale', statut: 'rejete' }),
  fiche({ slug: 'mesure-theorie-musicale', terme: 'mesure', discipline: 'theorie-musicale', confusion: 'polysemie-externe' }),
  fiche({ slug: 'mesure-escalade', terme: 'mesure', discipline: 'escalade', confusion: 'polysemie-externe' }),
]

describe('normaliser', () => {
  it('passe en minuscules et retire les accents', () => {
    expect(normaliser('Tempérament')).toBe('temperament')
  })

  it('traite ç, œ et æ', () => {
    expect(normaliser('Ça et Œuvre')).toBe('ca et oeuvre')
  })

  it('réduit les espaces multiples et coupe les bords', () => {
    expect(normaliser('  deux   mots ')).toBe('deux mots')
  })
})

describe('analyserCriteres', () => {
  it('lit une valeur simple', () => {
    const c = analyserCriteres(new URLSearchParams('discipline=escalade'), valides)
    expect(c.disciplines).toEqual(['escalade'])
  })

  it('lit plusieurs valeurs séparées par des virgules', () => {
    const c = analyserCriteres(new URLSearchParams('statut=pointe,rejete'), valides)
    expect(c.statuts).toEqual(['pointe', 'rejete'])
  })

  it('écarte les valeurs inconnues et garde les valides', () => {
    const c = analyserCriteres(new URLSearchParams('discipline=klingon,escalade'), valides)
    expect(c.disciplines).toEqual(['escalade'])
  })

  it('rend des critères vides pour un paramètre vide', () => {
    expect(analyserCriteres(new URLSearchParams('statut='), valides)).toEqual(CRITERES_VIDES)
  })

  it('rend des critères vides pour une URL sans paramètre', () => {
    expect(analyserCriteres(new URLSearchParams(''), valides)).toEqual(CRITERES_VIDES)
  })

  it('conserve la recherche telle que saisie', () => {
    expect(analyserCriteres(new URLSearchParams('q=Tempé'), valides).q).toBe('Tempé')
  })
})

describe('filtrerFiches', () => {
  it('rend tout le corpus sans critère', () => {
    expect(filtrerFiches(CORPUS, CRITERES_VIDES)).toHaveLength(5)
  })

  it('filtre par discipline', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, disciplines: ['comptabilite'] })
    expect(r.map((f) => f.slug)).toEqual(['actif-comptabilite'])
  })

  it('traite plusieurs valeurs d\'un même critère comme un OU', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, statuts: ['propose', 'rejete'] })
    expect(r).toHaveLength(2)
  })

  it('traite deux critères différents comme un ET', () => {
    const r = filtrerFiches(CORPUS, {
      ...CRITERES_VIDES,
      disciplines: ['theorie-musicale'],
      confusions: ['polysemie-externe'],
    })
    expect(r.map((f) => f.slug)).toEqual(['mesure-theorie-musicale'])
  })

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'TEMPERAMENT' })).toHaveLength(1)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'tempé' })).toHaveLength(1)
  })

  it('cherche aussi dans le resume et les suggestions', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'algébrique' })).toHaveLength(1)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'avoir' })).toHaveLength(1)
  })

  it('rend les deux fiches d\'un même terme analysé dans deux disciplines', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'mesure' })
    expect(r.map((f) => f.discipline).sort()).toEqual(['escalade', 'theorie-musicale'])
  })

  it('traite la recherche comme du texte, jamais comme une expression régulière', () => {
    expect(() => filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '(' })).not.toThrow()
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '.*' })).toHaveLength(0)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '<script>' })).toHaveLength(0)
  })

  it('rend une liste vide, pas le corpus entier, quand rien ne correspond', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'licorne' })).toEqual([])
  })

  it('ne modifie pas le tableau reçu', () => {
    const copie = [...CORPUS]
    filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'mesure' })
    expect(CORPUS).toEqual(copie)
  })
})

describe('ecrireCriteres', () => {
  it('écrit les critères actifs et omet les vides', () => {
    expect(ecrireCriteres({ ...CRITERES_VIDES, disciplines: ['escalade'], q: 'mesure' }))
      .toBe('discipline=escalade&q=mesure')
  })

  it('joint les valeurs multiples par des virgules', () => {
    expect(ecrireCriteres({ ...CRITERES_VIDES, statuts: ['pointe', 'rejete'] })).toBe('statut=pointe%2Crejete')
  })

  it('n\'écrit la vue que lorsqu\'elle est fournie', () => {
    expect(ecrireCriteres(CRITERES_VIDES)).toBe('')
    expect(ecrireCriteres(CRITERES_VIDES, 'carte')).toBe('vue=carte')
  })

  it('fait l\'aller-retour avec analyserCriteres', () => {
    const criteres = { disciplines: ['escalade'], confusions: [], statuts: ['pointe'], q: 'mesure' }
    expect(analyserCriteres(new URLSearchParams(ecrireCriteres(criteres)), valides)).toEqual(criteres)
  })
})

describe('aUnFiltre', () => {
  it('est faux sans critère', () => {
    expect(aUnFiltre(CRITERES_VIDES)).toBe(false)
  })

  it('est vrai dès qu\'un critère est posé', () => {
    expect(aUnFiltre({ ...CRITERES_VIDES, q: 'a' })).toBe(true)
    expect(aUnFiltre({ ...CRITERES_VIDES, statuts: ['pointe'] })).toBe(true)
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npm run test:once lib/filtrage.test.ts lib/content/index.test.ts`
Expected: FAIL — `Failed to resolve import "./filtrage"` et `getIndex` introuvable

- [ ] **Step 3: Ajouter `FicheIndex` à `lib/content/schema.ts`**

```ts
export type FicheIndex = Omit<FicheMeta, 'cree' | 'modifie'>
```

- [ ] **Step 4: Ajouter `getIndex` à `lib/content/fiches.ts`**

Ajouter l'import du type puis la fonction :

```ts
import { creerSchemaFiche, type Fiche, type FicheIndex, type Taxonomies } from './schema'

export function getIndex(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): FicheIndex[] {
  return getFiches(dossier, taxonomies).map((fiche) => ({
    slug: fiche.slug,
    terme: fiche.terme,
    discipline: fiche.discipline,
    confusion: fiche.confusion,
    statut: fiche.statut,
    resume: fiche.resume,
    suggestions: fiche.suggestions,
  }))
}
```

- [ ] **Step 5: Écrire `lib/filtrage.ts`**

```ts
import type { FicheIndex } from './content/schema'

export type Criteres = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
  q: string
}

export type SlugsValides = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
}

export const CRITERES_VIDES: Criteres = { disciplines: [], confusions: [], statuts: [], q: '' }

export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function lireListe(params: URLSearchParams, cle: string, autorises: string[]): string[] {
  const brut = params.get(cle)
  if (!brut) return []
  return brut
    .split(',')
    .map((v) => v.trim())
    .filter((v) => autorises.includes(v))
}

export function analyserCriteres(params: URLSearchParams, valides: SlugsValides): Criteres {
  return {
    disciplines: lireListe(params, 'discipline', valides.disciplines),
    confusions: lireListe(params, 'confusion', valides.confusions),
    statuts: lireListe(params, 'statut', valides.statuts),
    q: params.get('q') ?? '',
  }
}

export function ecrireCriteres(criteres: Criteres, vue?: 'carte' | 'liste'): string {
  const params = new URLSearchParams()
  if (vue) params.set('vue', vue)
  if (criteres.disciplines.length) params.set('discipline', criteres.disciplines.join(','))
  if (criteres.confusions.length) params.set('confusion', criteres.confusions.join(','))
  if (criteres.statuts.length) params.set('statut', criteres.statuts.join(','))
  if (criteres.q.trim()) params.set('q', criteres.q.trim())
  return params.toString()
}

export function aUnFiltre(criteres: Criteres): boolean {
  return (
    criteres.disciplines.length > 0 ||
    criteres.confusions.length > 0 ||
    criteres.statuts.length > 0 ||
    criteres.q.trim() !== ''
  )
}

export function filtrerFiches(index: FicheIndex[], criteres: Criteres): FicheIndex[] {
  const recherche = normaliser(criteres.q)

  return index.filter((fiche) => {
    if (criteres.disciplines.length && !criteres.disciplines.includes(fiche.discipline)) return false
    if (criteres.confusions.length && !criteres.confusions.includes(fiche.confusion)) return false
    if (criteres.statuts.length && !criteres.statuts.includes(fiche.statut)) return false
    if (!recherche) return true

    const champs = [fiche.terme, fiche.resume, ...fiche.suggestions]
    return champs.some((champ) => normaliser(champ).includes(recherche))
  })
}
```

La recherche se fait par `String.includes` sur du texte normalisé : aucune expression régulière n'est construite depuis la saisie de l'utilisateur, donc ni plantage ni injection possible.

- [ ] **Step 6: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once lib`
Expected: PASS — l'ensemble des tests des tâches 2 à 5 réussit

- [ ] **Step 7: Commit**

```bash
git add lib
git commit -m "feat: index du corpus et filtrage pur avec recherche sans accents"
```

---

### Task 6: Vérification de cohérence et `lint:content`

**Files:**
- Create: `scripts/coherence.ts`
- Create: `scripts/lint-content.ts`
- Test: `scripts/coherence.test.ts`

**Interfaces:**
- Consumes: `getFiches`, `Fiche` (Tâche 3), `listerTitres` (Tâche 4), `LONGUEUR_MAX_RESUME` (Tâche 3).
- Produces :

```ts
// scripts/coherence.ts
export type Avertissement = { slug: string; message: string }
export function verifierCoherence(fiche: Fiche): Avertissement[]
export function verifierCorpus(fiches: Fiche[]): Avertissement[]
```

Le script `lint-content.ts` charge le corpus réel (ce qui fait déjà remonter toute erreur bloquante de schéma), affiche les avertissements, et sort en code 0 même s'il y en a : un avertissement n'est pas une erreur. Une erreur de schéma, elle, propage et sort en code 1.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `scripts/coherence.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Fiche } from '../lib/content/schema'
import { verifierCoherence, verifierCorpus } from './coherence'
import { getFiches } from '../lib/content/fiches'
import { DOSSIER_CONTENU } from '../lib/content/taxonomies'

function fiche(p: Partial<Fiche> = {}): Fiche {
  return {
    slug: 'groupe-mathematiques',
    terme: 'groupe',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: 'court',
    suggestions: [],
    cree: new Date('2026-10-03'),
    modifie: new Date('2026-10-03'),
    corps: '## Pourquoi c\'est confus\n\ntexte\n\n## Risques\n\ntexte\n',
    ...p,
  }
}

describe('verifierCoherence', () => {
  it('ne signale rien sur une fiche saine', () => {
    expect(verifierCoherence(fiche())).toEqual([])
  })

  it('signale l\'absence de section Risques', () => {
    const a = verifierCoherence(fiche({ corps: '## Pourquoi c\'est confus\n\ntexte\n' }))
    expect(a).toHaveLength(1)
    expect(a[0]).toEqual({ slug: 'groupe-mathematiques', message: expect.stringMatching(/Risques/) })
  })

  it('signale un statut pointe accompagné de suggestions', () => {
    const a = verifierCoherence(fiche({ statut: 'pointe', suggestions: ['truc'] }))
    expect(a.map((x) => x.message).join()).toMatch(/pointe/)
  })

  it('signale un statut propose sans aucune suggestion', () => {
    const a = verifierCoherence(fiche({ statut: 'propose', suggestions: [] }))
    expect(a.map((x) => x.message).join()).toMatch(/propose/)
  })

  it('accepte un statut rejete avec ou sans suggestions', () => {
    expect(verifierCoherence(fiche({ statut: 'rejete', suggestions: [] }))).toEqual([])
    expect(verifierCoherence(fiche({ statut: 'rejete', suggestions: ['truc'] }))).toEqual([])
  })

  it('signale un resume proche de la limite', () => {
    const a = verifierCoherence(fiche({ resume: 'a'.repeat(230) }))
    expect(a.map((x) => x.message).join()).toMatch(/resume/)
  })

  it('signale une date de modification antérieure à la création', () => {
    const a = verifierCoherence(fiche({ cree: new Date('2026-10-03'), modifie: new Date('2026-01-01') }))
    expect(a.map((x) => x.message).join()).toMatch(/modifie/)
  })

  it('cumule plusieurs avertissements sur une même fiche', () => {
    expect(verifierCoherence(fiche({ statut: 'propose', suggestions: [], corps: 'rien' }))).toHaveLength(2)
  })
})

describe('verifierCorpus', () => {
  it('ne signale rien sur le corpus réel du dépôt', () => {
    expect(verifierCorpus(getFiches(DOSSIER_CONTENU))).toEqual([])
  })

  it('rend une liste vide pour un corpus vide', () => {
    expect(verifierCorpus([])).toEqual([])
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once scripts/coherence.test.ts`
Expected: FAIL — `Failed to resolve import "./coherence"`

- [ ] **Step 3: Écrire `scripts/coherence.ts`**

```ts
import { listerTitres } from '../lib/content/markdown'
import { LONGUEUR_MAX_RESUME, type Fiche } from '../lib/content/schema'

export type Avertissement = { slug: string; message: string }

const SEUIL_RESUME = Math.floor(LONGUEUR_MAX_RESUME * 0.95)

export function verifierCoherence(fiche: Fiche): Avertissement[] {
  const avertissements: string[] = []
  const titres = listerTitres(fiche.corps).map((t) => t.toLowerCase())

  if (!titres.includes('risques')) {
    avertissements.push(
      'aucune section « ## Risques » : le manifeste demande d\'identifier les risques de la modification',
    )
  }

  if (fiche.statut === 'pointe' && fiche.suggestions.length > 0) {
    avertissements.push(
      'statut « pointe » alors que des suggestions sont proposées : le statut devrait être « propose »',
    )
  }

  if (fiche.statut === 'propose' && fiche.suggestions.length === 0) {
    avertissements.push(
      'statut « propose » sans aucune suggestion : le statut devrait être « pointe »',
    )
  }

  if (fiche.resume.length >= SEUIL_RESUME) {
    avertissements.push(
      `resume de ${fiche.resume.length} caractères, proche de la limite de ${LONGUEUR_MAX_RESUME}`,
    )
  }

  if (fiche.modifie.getTime() < fiche.cree.getTime()) {
    avertissements.push('modifie est antérieur à cree')
  }

  return avertissements.map((message) => ({ slug: fiche.slug, message }))
}

export function verifierCorpus(fiches: Fiche[]): Avertissement[] {
  return fiches.flatMap(verifierCoherence)
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once scripts/coherence.test.ts`
Expected: PASS — tous les tests du fichier réussissent. Si « le corpus réel » échoue, corriger les fiches de l'Annexe B, pas le seuil.

- [ ] **Step 5: Écrire le script `scripts/lint-content.ts`**

```ts
import { getFiches } from '../lib/content/fiches'
import { chargerTaxonomies, DOSSIER_CONTENU } from '../lib/content/taxonomies'
import { verifierCorpus } from './coherence'

function principal(): void {
  const taxonomies = chargerTaxonomies(DOSSIER_CONTENU)
  const fiches = getFiches(DOSSIER_CONTENU, taxonomies)
  const avertissements = verifierCorpus(fiches)

  console.log(
    `${fiches.length} fiche(s), ${taxonomies.disciplines.length} discipline(s) — validation du schéma réussie.`,
  )

  if (avertissements.length === 0) {
    console.log('Aucun avertissement.')
    return
  }

  console.log(`\n${avertissements.length} avertissement(s) :`)
  for (const { slug, message } of avertissements) {
    console.log(`  ${slug} : ${message}`)
  }
  console.log('\nCes points ne bloquent pas le déploiement.')
}

principal()
```

- [ ] **Step 6: Lancer le script sur le corpus réel**

Run: `npm run lint:content`
Expected: « 5 fiche(s), 4 discipline(s) — validation du schéma réussie. » puis « Aucun avertissement. », code de sortie 0.

Vérifier ensuite qu'une erreur de schéma fait bien échouer le script :

```bash
printf '%s\n' '---' 'terme: test' 'discipline: klingon' 'confusion: jargon-opaque' \
  'statut: pointe' 'resume: test' 'suggestions: []' 'cree: 2026-10-03' 'modifie: 2026-10-03' '---' \
  > content/fiches/zz-temporaire.md
npm run lint:content; echo "code de sortie : $?"
rm content/fiches/zz-temporaire.md
```
Expected: le script affiche une erreur citant `zz-temporaire.md` et `klingon`, code de sortie 1.

- [ ] **Step 7: Commit**

```bash
git add scripts
git commit -m "feat: lint:content, avertissements de cohérence des fiches"
```

---

### Task 7: Mise en page, accueil, manifeste, contribuer

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `components/navigation.tsx`
- Create: `components/prose.tsx`
- Create: `app/manifeste/page.tsx`
- Create: `app/contribuer/page.tsx`
- Test: `components/navigation.test.tsx`
- Test: `components/prose.test.tsx`

**Interfaces:**
- Consumes: `getDocument` (Tâche 3), `getIndex` (Tâche 5), `rendreMarkdown` (Tâche 4).
- Produces :

```ts
// components/navigation.tsx
export function Navigation(): JSX.Element            // composant serveur, liens en dur vers les 4 routes

// components/prose.tsx
export function Prose({ html }: { html: string }): JSX.Element
```

`Prose` encapsule l'unique usage de `dangerouslySetInnerHTML` du projet. Le HTML qu'il reçoit vient toujours de `rendreMarkdown`, qui échappe le HTML brut de la source (Tâche 4) : c'est pourquoi l'injection reste impossible même si une fiche contient une balise.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `components/navigation.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Navigation } from './navigation'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

describe('Navigation', () => {
  it('mène aux quatre destinations du site', () => {
    render(<Navigation />)
    expect(screen.getByRole('link', { name: /simplistique/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /manifeste/i })).toHaveAttribute('href', '/manifeste')
    expect(screen.getByRole('link', { name: /fiches/i })).toHaveAttribute('href', '/fiches')
    expect(screen.getByRole('link', { name: /contribuer/i })).toHaveAttribute('href', '/contribuer')
  })

  it('est une balise de navigation repérable', () => {
    render(<Navigation />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
```

Créer `components/prose.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { rendreMarkdown } from '../lib/content/markdown'
import { Prose } from './prose'

describe('Prose', () => {
  it('affiche le HTML rendu depuis du markdown', async () => {
    render(<Prose html={await rendreMarkdown('## Un titre\n\nUn paragraphe.')} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Un titre' })).toBeInTheDocument()
    expect(screen.getByText('Un paragraphe.')).toBeInTheDocument()
  })

  it('n\'affiche aucun crochet double issu de la source', async () => {
    const { container } = render(<Prose html={await rendreMarkdown('un frein à la [[clarté]]')} />)
    expect(container.textContent).toContain('un frein à la clarté')
    expect(container.textContent).not.toContain('[[')
  })

  it('n\'exécute pas le HTML brut présent dans la source', async () => {
    const { container } = render(<Prose html={await rendreMarkdown('<script>alert(1)</script>')} />)
    expect(container.querySelector('script')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npm run test:once components`
Expected: FAIL — `Failed to resolve import "./navigation"`

- [ ] **Step 3: Écrire les deux composants**

Créer `components/navigation.tsx` :

```tsx
import Link from 'next/link'

const LIENS = [
  { href: '/manifeste', libelle: 'Manifeste' },
  { href: '/fiches', libelle: 'Fiches' },
  { href: '/contribuer', libelle: 'Contribuer' },
] as const

export function Navigation() {
  return (
    <nav className="border-b border-stone-200">
      <div className="mx-auto flex max-w-3xl flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4">
        <Link href="/" className="font-semibold tracking-tight text-stone-900">
          Simplistique
        </Link>
        <div className="flex gap-x-5 text-sm">
          {LIENS.map(({ href, libelle }) => (
            <Link key={href} href={href} className="text-stone-600 hover:text-stone-900">
              {libelle}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

Créer `components/prose.tsx` :

```tsx
export function Prose({ html }: { html: string }) {
  return (
    <div
      className="prose prose-stone max-w-none prose-headings:font-semibold prose-headings:tracking-tight"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 4: Activer le greffon typographique de Tailwind**

Dans `app/globals.css`, juste après la ligne `@import "tailwindcss";`, ajouter :

```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once components`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 6: Écrire la mise en page globale**

Remplacer `app/layout.tsx` par :

```tsx
import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Simplistique', template: '%s — Simplistique' },
  description:
    'Simplifier le langage des disciplines scientifiques et artistiques, pour abaisser la barrière à l\'entrée et bâtir des ponts entre elles.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-stone-50 text-stone-900 antialiased">
        <Navigation />
        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
        <footer className="mx-auto max-w-3xl px-5 pb-10 text-sm text-stone-500">
          Un corpus ouvert. Les suggestions passent par le dépôt — voir{' '}
          <a className="underline" href="/contribuer">
            Contribuer
          </a>
          .
        </footer>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Écrire les trois pages de texte**

Remplacer `app/page.tsx` par :

```tsx
import Link from 'next/link'
import { getIndex } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

export default function Accueil() {
  const fiches = getIndex()
  const disciplines = chargerTaxonomies().disciplines

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">La simplistique</h1>
      <p className="text-lg leading-relaxed text-stone-700">
        Une discipline qui cherche à simplifier les autres disciplines par le langage. Elle n'apporte
        pas de connaissance nouvelle : elle rend accessible celle qui existe déjà.
      </p>
      <p className="leading-relaxed text-stone-700">
        {fiches.length} terme{fiches.length > 1 ? 's' : ''} analysé{fiches.length > 1 ? 's' : ''} dans{' '}
        {disciplines.length} discipline{disciplines.length > 1 ? 's' : ''}.
      </p>
      <div className="flex gap-4 pt-2">
        <Link
          href="/fiches"
          className="rounded bg-stone-900 px-4 py-2 text-sm text-stone-50 hover:bg-stone-700"
        >
          Parcourir les fiches
        </Link>
        <Link
          href="/manifeste"
          className="rounded border border-stone-300 px-4 py-2 text-sm hover:border-stone-500"
        >
          Lire le manifeste
        </Link>
      </div>
    </div>
  )
}
```

Créer `app/manifeste/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { Prose } from '@/components/prose'
import { getDocument } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'

export const metadata: Metadata = { title: 'Manifeste' }

export default async function PageManifeste() {
  return <Prose html={await rendreMarkdown(getDocument('manifeste'))} />
}
```

Créer `app/contribuer/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { Prose } from '@/components/prose'
import { getDocument } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'

export const metadata: Metadata = { title: 'Contribuer' }

export default async function PageContribuer() {
  return <Prose html={await rendreMarkdown(getDocument('contribuer'))} />
}
```

- [ ] **Step 8: Vérifier que le build génère bien trois pages statiques**

Run: `npm run build`
Expected: le build réussit et marque `/`, `/manifeste` et `/contribuer` comme statiques (`○`).

- [ ] **Step 9: Commit**

```bash
git add app components
git commit -m "feat: mise en page, accueil, manifeste et page contribuer"
```

---

### Task 8: Page d'une fiche

**Files:**
- Create: `components/badge-statut.tsx`
- Create: `components/entete-fiche.tsx`
- Create: `app/fiches/[slug]/page.tsx`
- Create: `app/not-found.tsx`
- Test: `components/entete-fiche.test.tsx`

**Interfaces:**
- Consumes: `getFiches`, `getFiche` (Tâche 3), `chargerTaxonomies` (Tâche 2), `rendreMarkdown` (Tâche 4), `Prose` (Tâche 7).
- Produces :

```tsx
export function BadgeStatut({ statut, nom }: { statut: Statut; nom: string }): JSX.Element
export function EnteteFiche(props: {
  fiche: FicheMeta
  nomDiscipline: string
  nomConfusion: string
  nomStatut: string
}): JSX.Element
```

Les composants reçoivent les libellés déjà résolus (`nomDiscipline`…) plutôt que la taxonomie entière : ils restent testables sans toucher au disque.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `components/entete-fiche.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FicheMeta } from '../lib/content/schema'
import { EnteteFiche } from './entete-fiche'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

function meta(p: Partial<FicheMeta> = {}): FicheMeta {
  return {
    slug: 'groupe-mathematiques',
    terme: 'groupe',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: 'Un mot courant au sens technique étranger.',
    suggestions: [],
    cree: new Date('2026-10-03'),
    modifie: new Date('2026-10-03'),
    ...p,
  }
}

const libelles = {
  nomDiscipline: 'Mathématiques',
  nomConfusion: 'Faux ami courant',
  nomStatut: 'Pointé',
}

describe('EnteteFiche', () => {
  it('met le terme en titre de niveau 1', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByRole('heading', { level: 1, name: 'groupe' })).toBeInTheDocument()
  })

  it('affiche discipline, type de confusion et statut en clair', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByText('Mathématiques')).toBeInTheDocument()
    expect(screen.getByText('Faux ami courant')).toBeInTheDocument()
    expect(screen.getByText('Pointé')).toBeInTheDocument()
  })

  it('dit explicitement qu\'aucune alternative n\'est proposée quand la liste est vide', () => {
    render(<EnteteFiche fiche={meta({ statut: 'pointe', suggestions: [] })} {...libelles} />)
    expect(screen.getByText(/aucune alternative/i)).toBeInTheDocument()
  })

  it('liste les suggestions quand il y en a plusieurs', () => {
    render(
      <EnteteFiche
        fiche={meta({ statut: 'propose', suggestions: ['avoir', 'ressource'] })}
        {...libelles}
        nomStatut="Proposé"
      />,
    )
    expect(screen.getByText('avoir')).toBeInTheDocument()
    expect(screen.getByText('ressource')).toBeInTheDocument()
    expect(screen.queryByText(/aucune alternative/i)).not.toBeInTheDocument()
  })

  it('relie la discipline au catalogue filtré sur elle', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByRole('link', { name: 'Mathématiques' })).toHaveAttribute(
      'href',
      '/fiches?discipline=mathematiques',
    )
  })

  it('affiche la date de modification dans un élément de temps lisible par une machine', () => {
    render(<EnteteFiche fiche={meta({ modifie: new Date('2026-11-20') })} {...libelles} />)
    expect(screen.getByText(/20 novembre 2026/)).toHaveAttribute('datetime', '2026-11-20')
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once components/entete-fiche.test.tsx`
Expected: FAIL — `Failed to resolve import "./entete-fiche"`

- [ ] **Step 3: Écrire `components/badge-statut.tsx`**

```tsx
import type { Statut } from '@/lib/content/schema'

const CLASSES: Record<Statut, string> = {
  pointe: 'border-amber-500 text-amber-700',
  propose: 'border-emerald-600 text-emerald-700',
  rejete: 'border-stone-400 text-stone-500',
}

export function BadgeStatut({ statut, nom }: { statut: Statut; nom: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${CLASSES[statut]}`}>{nom}</span>
  )
}
```

- [ ] **Step 4: Écrire `components/entete-fiche.tsx`**

```tsx
import Link from 'next/link'
import type { FicheMeta } from '@/lib/content/schema'
import { BadgeStatut } from './badge-statut'

function enFrancais(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function EnteteFiche({
  fiche,
  nomDiscipline,
  nomConfusion,
  nomStatut,
}: {
  fiche: FicheMeta
  nomDiscipline: string
  nomConfusion: string
  nomStatut: string
}) {
  return (
    <header className="mb-8 space-y-4 border-b border-stone-200 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight">{fiche.terme}</h1>
      <p className="text-lg leading-relaxed text-stone-700">{fiche.resume}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Link
          href={`/fiches?discipline=${fiche.discipline}`}
          className="text-stone-600 underline hover:text-stone-900"
        >
          {nomDiscipline}
        </Link>
        <Link
          href={`/fiches?confusion=${fiche.confusion}`}
          className="text-stone-600 underline hover:text-stone-900"
        >
          {nomConfusion}
        </Link>
        <BadgeStatut statut={fiche.statut} nom={nomStatut} />
      </div>

      <div className="text-sm">
        {fiche.suggestions.length === 0 ? (
          <p className="text-stone-500">Aucune alternative proposée à ce stade.</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-stone-500">
              Suggestion{fiche.suggestions.length > 1 ? 's' : ''} :
            </span>
            {fiche.suggestions.map((s) => (
              <span key={s} className="rounded bg-stone-200 px-2 py-0.5 font-medium">
                {s}
              </span>
            ))}
          </p>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Modifiée le{' '}
        <time dateTime={fiche.modifie.toISOString().slice(0, 10)}>{enFrancais(fiche.modifie)}</time>
      </p>
    </header>
  )
}
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once components/entete-fiche.test.tsx`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 6: Écrire la route de la fiche**

Créer `app/fiches/[slug]/page.tsx` :

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EnteteFiche } from '@/components/entete-fiche'
import { Prose } from '@/components/prose'
import { getFiche, getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getFiches().map((fiche) => ({ slug: fiche.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const fiche = getFiche((await params).slug)
  if (!fiche) return {}
  return { title: fiche.terme, description: fiche.resume }
}

function nomDe(entrees: { slug: string; nom: string }[], slug: string): string {
  return entrees.find((e) => e.slug === slug)?.nom ?? slug
}

export default async function PageFiche({ params }: Params) {
  const taxonomies = chargerTaxonomies()
  const fiche = getFiche((await params).slug, undefined, taxonomies)
  if (!fiche) notFound()

  return (
    <article>
      <EnteteFiche
        fiche={fiche}
        nomDiscipline={nomDe(taxonomies.disciplines, fiche.discipline)}
        nomConfusion={nomDe(taxonomies.confusions, fiche.confusion)}
        nomStatut={nomDe(taxonomies.statuts, fiche.statut)}
      />
      <Prose html={await rendreMarkdown(fiche.corps)} />
    </article>
  )
}
```

- [ ] **Step 7: Écrire la page 404**

Créer `app/not-found.tsx` :

```tsx
import Link from 'next/link'

export default function NonTrouve() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Cette page n'existe pas</h1>
      <p className="text-stone-700">
        Le terme que vous cherchez n'a peut-être pas encore de fiche — ce qui est une invitation.
      </p>
      <p>
        <Link href="/fiches" className="underline">
          Parcourir les fiches
        </Link>{' '}
        ou{' '}
        <Link href="/contribuer" className="underline">
          proposer une analyse
        </Link>
        .
      </p>
    </div>
  )
}
```

- [ ] **Step 8: Vérifier que les cinq fiches sont générées en statique**

Run: `npm run build`
Expected: le build liste `/fiches/[slug]` avec cinq chemins pré-rendus (`groupe-mathematiques`, `actif-comptabilite`, `passif-comptabilite`, `statique-escalade`, `mesure-theorie-musicale`).

- [ ] **Step 9: Commit**

```bash
git add app components
git commit -m "feat: page d'une fiche et page 404"
```

---

### Task 9: Vue liste, filtres et état dans l'URL

**Files:**
- Create: `components/filtres.tsx`
- Create: `components/vue-liste.tsx`
- Create: `components/corpus.tsx`
- Create: `app/fiches/page.tsx`
- Test: `components/corpus.test.tsx`, `components/vue-liste.test.tsx`

**Interfaces:**
- Consumes: `FicheIndex`, `Discipline`, `EntreeTaxonomie` (Tâches 2, 5), `analyserCriteres`, `ecrireCriteres`, `filtrerFiches`, `aUnFiltre`, `CRITERES_VIDES` (Tâche 5), `BadgeStatut` (Tâche 8).
- Produces :

```tsx
// components/corpus.tsx
export type Vue = 'carte' | 'liste'
export function vueParDefaut(): Vue                 // carte sur grand écran, liste sinon
export function Corpus(props: {
  index: FicheIndex[]
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}): JSX.Element                                    // composant client, lit et écrit l'URL

// components/filtres.tsx
export function Filtres(props: {
  criteres: Criteres
  groupes: { cle: 'disciplines' | 'confusions' | 'statuts'; libelle: string; entrees: { slug: string; nom: string }[] }[]
  onChange: (criteres: Criteres) => void
  onEffacer: () => void
  filtreActif: boolean
}): JSX.Element

// components/vue-liste.tsx
export type Libelles = { disciplines: Map<string, string>; statuts: Map<string, string> }
export type Colonne = 'terme' | 'discipline' | 'statut'
export function trierFiches(fiches: FicheIndex[], colonne: Colonne, croissant: boolean, libelles: Libelles): FicheIndex[]
export function VueListe(props: { fiches: FicheIndex[]; libelles: Libelles }): JSX.Element
```

`Corpus` est le seul composant client du projet. Il détient l'état (critères + vue) et le synchronise avec l'URL par `router.replace`, ce qui évite d'empiler une entrée d'historique par frappe au clavier. La Tâche 10 lui ajoutera la vue carte ; en Tâche 9 la bascule existe déjà mais n'affiche que la liste.

`useSearchParams` oblige à envelopper le composant dans `<Suspense>` pour que la page reste statique : c'est fait dans `app/fiches/page.tsx`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `components/corpus.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { Corpus } from './corpus'

const remplacer = vi.fn()
let recherche = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: remplacer, push: remplacer }),
  useSearchParams: () => new URLSearchParams(recherche),
  usePathname: () => '/fiches',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

const disciplines = [
  { slug: 'mathematiques', nom: 'Mathématiques', couleur: '#e8703a', description: 'a' },
  { slug: 'escalade', nom: 'Escalade', couleur: '#3fa08a', description: 'b' },
]
const confusions = [{ slug: 'faux-ami-courant', nom: 'Faux ami courant', description: 'c' }]
const statuts = [
  { slug: 'pointe', nom: 'Pointé', description: 'd' },
  { slug: 'propose', nom: 'Proposé', description: 'e' },
  { slug: 'rejete', nom: 'Rejeté', description: 'f' },
]

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const index: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe' }),
  fiche({ slug: 'temperament-escalade', terme: 'tempérament', discipline: 'escalade', statut: 'rejete' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose', suggestions: ['contrôlé'] }),
]

function afficher() {
  return render(
    <Corpus index={index} disciplines={disciplines} confusions={confusions} statuts={statuts} />,
  )
}

beforeEach(() => {
  remplacer.mockClear()
  recherche = ''
})

describe('Corpus — vue liste', () => {
  it('affiche toutes les fiches sans filtre', () => {
    afficher()
    expect(screen.getByRole('link', { name: /groupe/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /statique/ })).toBeInTheDocument()
  })

  it('lie chaque ligne à la fiche correspondante', () => {
    afficher()
    expect(screen.getByRole('link', { name: /groupe/ })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
  })

  it('annonce le nombre de fiches affichées', () => {
    afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })
})

describe('Corpus — filtres et URL', () => {
  it('écrit le filtre de discipline dans l\'URL', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Escalade' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?discipline=escalade', { scroll: false })
  })

  it('lit le filtre depuis l\'URL au premier affichage', () => {
    recherche = 'discipline=escalade'
    afficher()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
  })

  it('ignore une discipline inconnue dans l\'URL et affiche tout', () => {
    recherche = 'discipline=klingon'
    afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('ignore une vue inconnue dans l\'URL et retombe sur un affichage valide', () => {
    recherche = 'vue=licorne'
    afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('filtre par recherche texte sans tenir compte des accents', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'tempe')
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
  })

  it('cumule deux filtres', () => {
    recherche = 'discipline=escalade&statut=rejete'
    afficher()
    expect(screen.getByText(/1 fiche/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
  })

  it('affiche un message explicite et un moyen d\'effacer quand rien ne correspond', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'licorne')
    expect(screen.getByText(/aucune fiche/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /effacer les filtres/i }))
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('conserve les filtres en changeant de vue', async () => {
    recherche = 'discipline=escalade'
    afficher()
    await userEvent.click(screen.getByRole('button', { name: /carte/i }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?vue=carte&discipline=escalade', { scroll: false })
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once components/corpus.test.tsx`
Expected: FAIL — `Failed to resolve import "./corpus"`

- [ ] **Step 3: Écrire `components/filtres.tsx`**

```tsx
'use client'

import type { Criteres } from '@/lib/filtrage'

type Groupe = { cle: 'disciplines' | 'confusions' | 'statuts'; libelle: string; entrees: { slug: string; nom: string }[] }

export function Filtres({
  criteres,
  groupes,
  onChange,
  onEffacer,
  filtreActif,
}: {
  criteres: Criteres
  groupes: Groupe[]
  onChange: (criteres: Criteres) => void
  onEffacer: () => void
  filtreActif: boolean
}) {
  function basculer(cle: Groupe['cle'], slug: string) {
    const actuels = criteres[cle]
    const suivants = actuels.includes(slug)
      ? actuels.filter((s) => s !== slug)
      : [...actuels, slug]
    onChange({ ...criteres, [cle]: suivants })
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        aria-label="Chercher un terme"
        placeholder="Chercher un terme…"
        value={criteres.q}
        onChange={(e) => onChange({ ...criteres, q: e.target.value })}
        className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
      />

      {groupes.map(({ cle, libelle, entrees }) => (
        <div key={cle} className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-stone-500">{libelle}</span>
          {entrees.map(({ slug, nom }) => {
            const actif = criteres[cle].includes(slug)
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={actif}
                onClick={() => basculer(cle, slug)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  actif ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300 text-stone-600'
                }`}
              >
                {nom}
              </button>
            )
          })}
        </div>
      ))}

      {filtreActif && (
        <button type="button" onClick={onEffacer} className="text-xs text-stone-500 underline">
          Effacer les filtres
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Écrire le test de la vue liste, qui échoue**

La spec §5.4 demande des colonnes triables. Le tri est un état d'affichage local, pas un critère de recherche : il ne va donc pas dans l'URL (§5.2 n'énumère que `vue`, `discipline`, `confusion`, `statut` et `q`).

Créer `components/vue-liste.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { trierFiches, VueListe, type Libelles } from './vue-liste'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

const libelles: Libelles = {
  disciplines: new Map([
    ['mathematiques', 'Mathématiques'],
    ['escalade', 'Escalade'],
  ]),
  statuts: new Map([
    ['pointe', 'Pointé'],
    ['propose', 'Proposé'],
    ['rejete', 'Rejeté'],
  ]),
}

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const fiches: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', statut: 'pointe' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose', suggestions: ['contrôlé'] }),
  fiche({ slug: 'corps-mathematiques', terme: 'corps', statut: 'rejete' }),
]

function termesAffiches(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((ligne) => ligne.querySelector('td')!.textContent!.trim())
}

describe('trierFiches', () => {
  it('trie par terme dans l\'ordre alphabétique français', () => {
    expect(trierFiches(fiches, 'terme', true, libelles).map((f) => f.terme)).toEqual([
      'corps',
      'groupe',
      'statique',
    ])
  })

  it('inverse l\'ordre quand on le demande', () => {
    expect(trierFiches(fiches, 'terme', false, libelles).map((f) => f.terme)).toEqual([
      'statique',
      'groupe',
      'corps',
    ])
  })

  it('trie par libellé de discipline, pas par slug', () => {
    expect(trierFiches(fiches, 'discipline', true, libelles).map((f) => f.discipline)).toEqual([
      'escalade',
      'mathematiques',
      'mathematiques',
    ])
  })

  it('trie par libellé de statut', () => {
    expect(trierFiches(fiches, 'statut', true, libelles).map((f) => f.statut)).toEqual([
      'pointe',
      'propose',
      'rejete',
    ])
  })

  it('ne modifie pas le tableau reçu', () => {
    const copie = [...fiches]
    trierFiches(fiches, 'statut', false, libelles)
    expect(fiches).toEqual(copie)
  })
})

describe('VueListe', () => {
  it('trie par terme à l\'ouverture', () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(termesAffiches()).toEqual(['corps', 'groupe', 'statique'])
  })

  it('lie chaque terme à sa fiche', () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(screen.getByRole('link', { name: 'groupe' })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
  })

  it('affiche un tiret quand il n\'y a aucune suggestion', () => {
    render(<VueListe fiches={[fiches[0]]} libelles={libelles} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('trie par statut au clic sur l\'en-tête', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    await userEvent.click(screen.getByRole('button', { name: 'Statut' }))
    expect(termesAffiches()).toEqual(['groupe', 'statique', 'corps'])
  })

  it('inverse le tri au second clic sur la même colonne', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    await userEvent.click(screen.getByRole('button', { name: 'Terme' }))
    expect(termesAffiches()).toEqual(['statique', 'groupe', 'corps'])
  })

  it('annonce la colonne triée et son sens aux lecteurs d\'écran', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(screen.getByRole('columnheader', { name: /Terme/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: 'Statut' }))
    expect(screen.getByRole('columnheader', { name: /Statut/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /Terme/ })).toHaveAttribute('aria-sort', 'none')
  })
})
```

- [ ] **Step 5: Écrire `components/vue-liste.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BadgeStatut } from './badge-statut'
import type { FicheIndex } from '@/lib/content/schema'

export type Libelles = { disciplines: Map<string, string>; statuts: Map<string, string> }
export type Colonne = 'terme' | 'discipline' | 'statut'

const TRIABLES: { cle: Colonne; libelle: string }[] = [
  { cle: 'terme', libelle: 'Terme' },
  { cle: 'discipline', libelle: 'Discipline' },
  { cle: 'statut', libelle: 'Statut' },
]

export function trierFiches(
  fiches: FicheIndex[],
  colonne: Colonne,
  croissant: boolean,
  libelles: Libelles,
): FicheIndex[] {
  const valeur = (fiche: FicheIndex): string => {
    if (colonne === 'discipline') return libelles.disciplines.get(fiche.discipline) ?? fiche.discipline
    if (colonne === 'statut') return libelles.statuts.get(fiche.statut) ?? fiche.statut
    return fiche.terme
  }

  const triees = [...fiches].sort((a, b) => valeur(a).localeCompare(valeur(b), 'fr'))
  return croissant ? triees : triees.reverse()
}

export function VueListe({ fiches, libelles }: { fiches: FicheIndex[]; libelles: Libelles }) {
  const [tri, setTri] = useState<{ colonne: Colonne; croissant: boolean }>({
    colonne: 'terme',
    croissant: true,
  })

  function basculerTri(colonne: Colonne) {
    setTri((actuel) =>
      actuel.colonne === colonne
        ? { colonne, croissant: !actuel.croissant }
        : { colonne, croissant: true },
    )
  }

  const triees = trierFiches(fiches, tri.colonne, tri.croissant, libelles)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
            {TRIABLES.map(({ cle, libelle }, i) => (
              <th
                key={cle}
                scope="col"
                aria-sort={
                  tri.colonne === cle ? (tri.croissant ? 'ascending' : 'descending') : 'none'
                }
                className={`py-2 font-normal ${i === 0 ? 'pr-4' : 'px-4'}`}
              >
                <button
                  type="button"
                  onClick={() => basculerTri(cle)}
                  className="uppercase hover:text-stone-900"
                >
                  {libelle}
                </button>
              </th>
            ))}
            <th scope="col" className="py-2 font-normal">
              Suggestion
            </th>
          </tr>
        </thead>
        <tbody>
          {triees.map((fiche) => (
            <tr key={fiche.slug} className="border-b border-stone-200 align-baseline">
              <td className="py-2 pr-4">
                <Link href={`/fiches/${fiche.slug}`} className="font-medium underline">
                  {fiche.terme}
                </Link>
              </td>
              <td className="px-4 py-2 text-stone-600">
                {libelles.disciplines.get(fiche.discipline) ?? fiche.discipline}
              </td>
              <td className="px-4 py-2">
                <BadgeStatut
                  statut={fiche.statut}
                  nom={libelles.statuts.get(fiche.statut) ?? fiche.statut}
                />
              </td>
              <td className="py-2 text-stone-600">
                {fiche.suggestions.length > 0 ? fiche.suggestions.join(', ') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

L'ordre des colonnes place « Suggestion » en dernier : les trois premières sont triables, la quatrième ne l'est pas (trier par suggestion n'a pas de sens quand la plupart sont vides).

- [ ] **Step 6: Lancer le test de la vue liste et vérifier qu'il passe**

Run: `npm run test:once components/vue-liste.test.tsx`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 7: Écrire `components/corpus.tsx`**

Trois points de conception, chacun imposé par la spec ou par le test :

- **L'état est local, l'URL en est le reflet.** Les critères vivent dans un `useState` initialisé depuis l'URL, et chaque changement écrit l'URL par `router.replace`. Piloter l'affichage directement par `useSearchParams` rendrait la saisie de recherche dépendante d'un aller-retour de routage à chaque frappe. Contrepartie assumée : les boutons précédent/suivant du navigateur ne resynchronisent pas les filtres.
- **`vue` n'est écrit dans l'URL qu'après une bascule explicite** (spec §5.2). D'où l'état `vueExplicite`, vrai si l'URL portait déjà une vue valide, ou dès que l'utilisateur clique la bascule.
- **Le défaut dépend de la largeur d'écran** : carte sur grand écran, liste sur petit (spec §5.2 et §9). Sans `matchMedia` disponible, on retombe sur la liste.

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { Discipline, EntreeTaxonomie, FicheIndex } from '@/lib/content/schema'
import {
  analyserCriteres,
  aUnFiltre,
  CRITERES_VIDES,
  ecrireCriteres,
  filtrerFiches,
  type Criteres,
} from '@/lib/filtrage'
import { Filtres } from './filtres'
import { VueListe, type Libelles } from './vue-liste'

export type Vue = 'carte' | 'liste'

const GRAND_ECRAN = '(min-width: 640px)'

export function vueParDefaut(): Vue {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'liste'
  return window.matchMedia(GRAND_ECRAN).matches ? 'carte' : 'liste'
}

export function Corpus({
  index,
  disciplines,
  confusions,
  statuts,
}: {
  index: FicheIndex[]
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}) {
  const router = useRouter()
  const chemin = usePathname()
  const params = useSearchParams()

  const valides = useMemo(
    () => ({
      disciplines: disciplines.map((d) => d.slug),
      confusions: confusions.map((c) => c.slug),
      statuts: statuts.map((s) => s.slug),
    }),
    [disciplines, confusions, statuts],
  )

  const vueDemandee = params.get('vue')
  const vueValide = vueDemandee === 'carte' || vueDemandee === 'liste' ? vueDemandee : null

  const [criteres, setCriteres] = useState<Criteres>(() =>
    analyserCriteres(new URLSearchParams(params.toString()), valides),
  )
  const [vue, setVue] = useState<Vue>(() => vueValide ?? vueParDefaut())
  const [vueExplicite, setVueExplicite] = useState(vueValide !== null)

  const fiches = filtrerFiches(index, criteres)

  const libelles: Libelles = useMemo(
    () => ({
      disciplines: new Map(disciplines.map((d) => [d.slug, d.nom])),
      statuts: new Map(statuts.map((s) => [s.slug, s.nom])),
    }),
    [disciplines, statuts],
  )

  function naviguer(prochainsCriteres: Criteres, prochaineVue: Vue) {
    const explicite = vueExplicite || prochaineVue !== vue

    setCriteres(prochainsCriteres)
    setVue(prochaineVue)
    setVueExplicite(explicite)

    const requete = ecrireCriteres(prochainsCriteres, explicite ? prochaineVue : undefined)
    router.replace(requete ? `${chemin}?${requete}` : chemin, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded border border-stone-300 text-xs">
          {(['carte', 'liste'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vue === v}
              onClick={() => naviguer(criteres, v)}
              className={`px-3 py-1 capitalize ${vue === v ? 'bg-stone-900 text-stone-50' : 'text-stone-600'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-500">
          {`${fiches.length} fiche${fiches.length > 1 ? 's' : ''}${
            fiches.length === index.length ? '' : ` sur ${index.length}`
          }`}
        </p>
      </div>

      <Filtres
        criteres={criteres}
        filtreActif={aUnFiltre(criteres)}
        onChange={(c) => naviguer(c, vue)}
        onEffacer={() => naviguer(CRITERES_VIDES, vue)}
        groupes={[
          { cle: 'disciplines', libelle: 'Discipline', entrees: disciplines },
          { cle: 'confusions', libelle: 'Confusion', entrees: confusions },
          { cle: 'statuts', libelle: 'Statut', entrees: statuts },
        ]}
      />

      {fiches.length === 0 ? (
        <p className="py-10 text-center text-stone-500">
          Aucune fiche ne correspond à ces critères.
        </p>
      ) : (
        <VueListe fiches={fiches} libelles={libelles} />
      )}
    </div>
  )
}
```

Le test « conserve les filtres en changeant de vue » attend `/fiches?vue=carte&discipline=escalade` : `ecrireCriteres` place `vue` en premier, l'ordre est donc garanti.

- [ ] **Step 8: Écrire `app/fiches/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Corpus } from '@/components/corpus'
import { getIndex } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

export const metadata: Metadata = { title: 'Fiches' }

export default function PageFiches() {
  const { disciplines, confusions, statuts } = chargerTaxonomies()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Les fiches</h1>
      <Suspense fallback={<p className="text-stone-500">Chargement du corpus…</p>}>
        <Corpus
          index={getIndex()}
          disciplines={disciplines}
          confusions={confusions}
          statuts={statuts}
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 9: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once components`
Expected: PASS — tous les tests des composants réussissent

- [ ] **Step 10: Vérifier que la page reste statique**

Run: `npm run build`
Expected: le build réussit et marque `/fiches` comme statique (`○`), sans avertissement sur `useSearchParams`.

- [ ] **Step 11: Commit**

```bash
git add app components
git commit -m "feat: catalogue filtrable avec état partagé dans l'URL"
```

---

### Task 10: Vue carte « constellations »

**Files:**
- Create: `components/vue-carte.tsx`
- Modify: `components/corpus.tsx` (brancher la vue carte)
- Test: `components/vue-carte.test.tsx`
- Modify: `components/corpus.test.tsx` (tests de bascule et de vue par défaut)

**Interfaces:**
- Consumes: `FicheIndex`, `Discipline`, `Statut` (Tâches 2, 5).
- Produces :

```tsx
export function VueCarte(props: {
  fiches: FicheIndex[]
  disciplines: Discipline[]
  libellesStatuts: Map<string, string>
}): JSX.Element
export function styleStatut(statut: Statut, couleur: string): {
  fill: string
  stroke: string
  fillOpacity: number
}
```

Encodage imposé par la spec §5.3 : couleur = discipline, remplissage = statut (plein pour `propose`, contour seul pour `pointe`, estompé pour `rejete`), taille uniforme. Chaque point est un `<a>` enveloppant un `<circle>`, avec un `<title>` pour l'infobulle et un `aria-label` pour les lecteurs d'écran.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `components/vue-carte.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { styleStatut, VueCarte } from './vue-carte'

const disciplines = [
  { slug: 'mathematiques', nom: 'Mathématiques', couleur: '#e8703a', description: 'a' },
  { slug: 'escalade', nom: 'Escalade', couleur: '#3fa08a', description: 'b' },
  { slug: 'comptabilite', nom: 'Comptabilité', couleur: '#3b82c4', description: 'c' },
]

const libellesStatuts = new Map([
  ['pointe', 'Pointé'],
  ['propose', 'Proposé'],
  ['rejete', 'Rejeté'],
])

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const fiches: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', statut: 'pointe' }),
  fiche({ slug: 'corps-mathematiques', terme: 'corps', statut: 'rejete' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose' }),
]

describe('styleStatut', () => {
  it('remplit le cercle pour une suggestion proposée', () => {
    expect(styleStatut('propose', '#e8703a')).toMatchObject({ fill: '#e8703a', fillOpacity: 1 })
  })

  it('laisse le cercle en contour pour un terme seulement pointé', () => {
    expect(styleStatut('pointe', '#e8703a')).toMatchObject({ fill: 'none', stroke: '#e8703a' })
  })

  it('estompe le cercle pour un changement rejeté', () => {
    const style = styleStatut('rejete', '#e8703a')
    expect(style.fillOpacity).toBeLessThan(1)
    expect(style.fillOpacity).toBeGreaterThan(0)
  })
})

describe('VueCarte', () => {
  it('fait de chaque fiche un lien réel, atteignable au clavier', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: /groupe/ })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('nomme chaque zone de discipline avec son compte de fiches', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Mathématiques/)).toBeInTheDocument()
    expect(screen.getByText(/Mathématiques/).textContent).toMatch(/2/)
    expect(screen.getByText(/Escalade/).textContent).toMatch(/1/)
  })

  it('dessine une discipline sans aucune fiche avec un compte de zéro', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Comptabilité/).textContent).toMatch(/0/)
  })

  it('ne plante pas sur un corpus entièrement vide', () => {
    render(<VueCarte fiches={[]} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText(/Mathématiques/).textContent).toMatch(/0/)
  })

  it('colore chaque point selon sa discipline', () => {
    const { container } = render(
      <VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const cercles = Array.from(container.querySelectorAll('circle'))
    const mathematiques = cercles.filter((c) => c.getAttribute('stroke') === '#e8703a')
    const escalade = cercles.filter((c) => c.getAttribute('stroke') === '#3fa08a')
    expect(mathematiques).toHaveLength(2)
    expect(escalade).toHaveLength(1)
  })

  it('donne le même rayon à tous les points', () => {
    const { container } = render(
      <VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const rayons = new Set(
      Array.from(container.querySelectorAll('circle')).map((c) => c.getAttribute('r')),
    )
    expect(rayons.size).toBe(1)
  })

  it('affiche une légende des trois statuts', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    for (const nom of ['Pointé', 'Proposé', 'Rejeté']) {
      expect(screen.getByText(nom)).toBeInTheDocument()
    }
  })

  it('décrit chaque point par son terme et son statut', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: 'groupe — Pointé' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once components/vue-carte.test.tsx`
Expected: FAIL — `Failed to resolve import "./vue-carte"`

- [ ] **Step 3: Écrire `components/vue-carte.tsx`**

```tsx
import { STATUTS, type Discipline, type FicheIndex, type Statut } from '@/lib/content/schema'

const RAYON = 7
const PAS = 26
const COLONNES = 8

export function styleStatut(statut: Statut, couleur: string) {
  if (statut === 'propose') return { fill: couleur, stroke: couleur, fillOpacity: 1 }
  if (statut === 'rejete') return { fill: couleur, stroke: couleur, fillOpacity: 0.25 }
  return { fill: 'none', stroke: couleur, fillOpacity: 1 }
}

function Zone({
  discipline,
  fiches,
  libellesStatuts,
}: {
  discipline: Discipline
  fiches: FicheIndex[]
  libellesStatuts: Map<string, string>
}) {
  const lignes = Math.max(1, Math.ceil(fiches.length / COLONNES))
  const hauteur = lignes * PAS + RAYON * 2

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-sm"
          style={{ backgroundColor: discipline.couleur }}
        />
        <h3 className="text-xs uppercase tracking-wide text-stone-500">
          {`${discipline.nom} · ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`}
        </h3>
      </div>
      <svg
        role="presentation"
        viewBox={`0 0 ${COLONNES * PAS} ${hauteur}`}
        className="w-full"
        style={{ maxHeight: hauteur }}
      >
        {fiches.map((fiche, i) => {
          const style = styleStatut(fiche.statut, discipline.couleur)
          const nomStatut = libellesStatuts.get(fiche.statut) ?? fiche.statut
          return (
            <a
              key={fiche.slug}
              href={`/fiches/${fiche.slug}`}
              aria-label={`${fiche.terme} — ${nomStatut}`}
            >
              <title>{`${fiche.terme} — ${nomStatut}`}</title>
              <circle
                cx={(i % COLONNES) * PAS + PAS / 2}
                cy={Math.floor(i / COLONNES) * PAS + PAS / 2}
                r={RAYON}
                strokeWidth={2}
                {...style}
              />
            </a>
          )
        })}
      </svg>
    </section>
  )
}

export function VueCarte({
  fiches,
  disciplines,
  libellesStatuts,
}: {
  fiches: FicheIndex[]
  disciplines: Discipline[]
  libellesStatuts: Map<string, string>
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        {disciplines.map((discipline) => (
          <Zone
            key={discipline.slug}
            discipline={discipline}
            fiches={fiches.filter((f) => f.discipline === discipline.slug)}
            libellesStatuts={libellesStatuts}
          />
        ))}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200 pt-4 text-xs text-stone-500">
        {STATUTS.map((statut) => {
          const style = styleStatut(statut, '#78716c')
          return (
            <div key={statut} className="flex items-center gap-2">
              <svg width={18} height={18} aria-hidden="true">
                <circle cx={9} cy={9} r={RAYON} strokeWidth={2} {...style} />
              </svg>
              <dt>{libellesStatuts.get(statut) ?? statut}</dt>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once components/vue-carte.test.tsx`
Expected: PASS — tous les tests du fichier réussissent

- [ ] **Step 5: Brancher la carte dans `components/corpus.tsx`**

Ajouter l'import :

```tsx
import { VueCarte } from './vue-carte'
```

Puis remplacer le bloc d'affichage final par :

```tsx
      {fiches.length === 0 ? (
        <p className="py-10 text-center text-stone-500">
          Aucune fiche ne correspond à ces critères.
        </p>
      ) : vue === 'carte' ? (
        <VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libelles.statuts} />
      ) : (
        <VueListe fiches={fiches} libelles={libelles} />
      )}
```

- [ ] **Step 6: Ajouter les tests de bascule dans `components/corpus.test.tsx`**

Ajouter `afterEach` à l'import de `vitest` en tête de fichier :

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
```

Puis ajouter à la fin du fichier :

```tsx
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Corpus — bascule entre les deux vues', () => {
  it('affiche la carte quand l\'URL le demande', () => {
    recherche = 'vue=carte'
    const { container } = afficher()
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0)
    expect(container.querySelector('table')).toBeNull()
  })

  it('affiche la liste quand l\'URL le demande', () => {
    recherche = 'vue=liste'
    const { container } = afficher()
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('choisit la liste par défaut sur petit écran', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const { container } = afficher()
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('choisit la carte par défaut sur grand écran', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const { container } = afficher()
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0)
    expect(container.querySelector('table')).toBeNull()
  })

  it('garde la recherche texte en passant à la carte', async () => {
    recherche = 'q=tempe'
    afficher()
    await userEvent.click(screen.getByRole('button', { name: /carte/i }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?vue=carte&q=tempe', { scroll: false })
  })

  it('n\'écrit pas la vue dans l\'URL tant qu\'on n\'a pas basculé', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Escalade' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?discipline=escalade', { scroll: false })
  })
})
```

- [ ] **Step 7: Lancer toute la suite et vérifier qu'elle passe**

Run: `npm run test:once`
Expected: PASS — l'ensemble des tests des tâches 2 à 10 réussit

- [ ] **Step 8: Vérifier le rendu réel dans le navigateur**

```bash
npm run build && npm run start
```

Ouvrir `http://localhost:3000/fiches`, vérifier à l'œil : la carte s'affiche, un clic sur un point mène à la fiche, la bascule conserve les filtres, et la page tient à 400 px de large sans débordement horizontal. Arrêter le serveur.

- [ ] **Step 9: Commit**

```bash
git add components
git commit -m "feat: vue carte constellations, encodage couleur et statut"
```

---

### Task 11: Intégration continue et déploiement

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Modify: `app/fiches/page.tsx` (lien de secours vers la carte en l'absence de JavaScript) — voir étape 4

**Interfaces:**
- Consumes: tout le reste.
- Produces: un dépôt dont chaque PR est vérifiée, et un README qui dit comment ajouter une fiche.

- [ ] **Step 1: Écrire le workflow d'intégration continue**

Créer `.github/workflows/ci.yml` :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verifier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run lint:content
      - run: npm run test:once
      - run: npm run lint
      - run: npm run build
```

- [ ] **Step 2: Vérifier localement la séquence exacte de la CI**

Run: `npm run lint:content && npm run test:once && npm run lint && npm run build`
Expected: les quatre commandes réussissent d'affilée.

- [ ] **Step 3: Écrire le README**

Créer `README.md` :

```markdown
# Simplistique

Site de la simplistique : une discipline qui cherche à simplifier les autres
disciplines par le langage. Voir `/manifeste` pour l'intention, et
`docs/superpowers/specs/` pour la conception.

## Démarrer

```bash
npm install
npm run dev
```

## Ajouter une fiche

1. Créer `content/fiches/<terme>-<discipline>.md`. Le nom du fichier devient
   l'URL ; il n'est jamais dérivé du terme, pour que deux disciplines puissent
   analyser le même mot.
2. Remplir le front-matter : `terme`, `discipline`, `confusion`, `statut`,
   `resume` (240 caractères max), `suggestions` (une liste, éventuellement
   vide), `cree`, `modifie`.
3. Développer dans le corps, sous les quatre titres d'usage :
   `## Pourquoi c'est confus`, `## Suggestion`, `## Risques`,
   `## D'où ça vient`.
4. Lancer `npm run lint:content`.

Les valeurs de `discipline` et `confusion` doivent exister dans
`content/taxonomies/`. Ajouter une discipline = ajouter une entrée YAML.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique ; échoue si une fiche est invalide |
| `npm run test:once` | Toute la suite de tests |
| `npm run lint:content` | Avertissements de cohérence des fiches |
```

- [ ] **Step 4: Donner un chemin vers la carte sans JavaScript**

La vue carte vit dans un composant client. Sans JavaScript, `/fiches` n'affiche
que le secours de `<Suspense>`, donc les fiches doivent rester atteignables
autrement. Ajouter dans `app/fiches/page.tsx`, à l'intérieur du `<div>` et
après le `</Suspense>` :

```tsx
      <noscript>
        <ul className="space-y-1 text-sm">
          {getIndex().map((fiche) => (
            <li key={fiche.slug}>
              <a href={`/fiches/${fiche.slug}`} className="underline">
                {fiche.terme}
              </a>{' '}
              <span className="text-stone-500">— {fiche.resume}</span>
            </li>
          ))}
        </ul>
      </noscript>
```

- [ ] **Step 5: Vérifier le build complet**

Run: `npm run build`
Expected: le build réussit ; toutes les routes sont statiques ; les cinq fiches sont pré-rendues.

- [ ] **Step 6: Commit**

```bash
git add .github README.md app
git commit -m "ci: vérification du contenu, des tests et du build sur chaque PR"
```

- [ ] **Step 7: Déployer**

À faire par Noël, puisque cela demande ses comptes :

1. Créer un dépôt GitHub et y pousser `main`.
2. Dans Vercel, importer le dépôt. Aucune variable d'environnement n'est
   nécessaire. Le préréglage Next.js convient tel quel.
3. Vérifier que le premier déploiement réussit et que `/fiches` fonctionne en
   production.

Une fois le dépôt en ligne, remplacer dans `content/contribuer.md` les deux
occurrences de `<URL-DU-DEPOT>` par l'adresse réelle, puis commiter.

---

## Annexe A — `content/manifeste.md`

Texte fourni par Noël, reproduit tel quel à l'exception de l'en-tête
(`Topic:`, `Tags:`, date) et des séparateurs, retirés parce qu'ils relèvent de
son outil de notes. Les `[[crochets]]` sont conservés dans la source : ils
s'affichent en texte simple (Tâche 4). Certaines phrases sont inachevées dans
l'original — elles sont gardées en l'état ; à Noël de les finir quand il le
souhaitera.

```markdown
# Qu'est-ce que la simplistique ?

La simplistique est une discipline qui vise à simplifier les disciplines
scientifiques et artistiques, à travers le [[langage]]. Elle n'apporte pas à
proprement parler de nouvelles connaissances.

## Raison d'être

L'hyperspécialisation est un phénomène qui semble s'accentuer au fur et à
mesure que les disciplines scientifiques se développent. Mon mot d'ordre, c'est
la transversalité. Sauf que pour développer les compétences dans les domaines,
cela demande du temps et de l'énergie.

Beaucoup de disciplines se sont construites sur des concepts ayant des noms qui
manquent de [[clarté]]. Les raisons sont multiples :

- manque de considération ;
- concept qui initialement ne semblait pas si important et s'est révélé
  important après ;
- construction décentralisée de la discipline ;
- volonté explicite de garder un élitisme et une barrière à l'entrée.

Ce manque de [[clarté]] est un frein à l'entrée pour ces disciplines. C'est
aussi un frein à la création de ponts entre les disciplines, et donc à la
transdisciplinarité.

# Ce que la simplistique n'est pas

## Limites de la simplistique

Modifier un mot, inventer un mot a aussi des effets négatifs. Ceux-ci doivent
être pris en compte dans la suggestion d'une nouvelle formulation.

- Laisser le chaos structurer les choses permet d'avoir des points de vue et
  des manières de structurer plus créatives. Il est par conséquent plus sage de
  commencer à simplifier les disciplines déjà bien établies, dont les concepts
  ne devraient plus trop bouger.
- La façon de structurer au mieux une discipline dépend du périmètre auquel on
  regarde ses concepts.
- Attention à laisser ouvertes des portes pour changer les choses, accueillir
  de nouveaux concepts. Si un concept comporte deux sous-concepts alors qu'il
  pourrait y en avoir trois, ne pas renommer les deux en « le premier » et « le
  dernier » : cela créerait un frein à la découverte de nouveaux concepts et au
  [[changement]]. La simplistique ne doit pas créer de frein supplémentaire au
  [[changement]].
- Le [[changement]] a un coût. Pour que les gens utilisent un mot, il faut que
  la plus-value de cette modification soit plus grande que le coût de
  modification. Autrement dit, on préférera garder un mot pas très
  [[Intuitivité|intuitif]] plutôt qu'utiliser un nouveau mot un peu moins
  intuitif.
- Si le [[changement]] est nécessaire pour assurer plus de [[cohérence]], la
  simplistique assume sa position de bousculer l'ordre établi, quitte à ce que
  ce [[changement]] se fasse sur des décennies.
- La notion d'[[Intuitivité]] reste assez subjective. Il faut en avoir
  conscience.
- La notion d'[[Intuitivité]] dépend de la culture des individus. Par
  conséquent, différentes langues pourraient avoir différentes approches.
- La simplistique s'octroie le droit de créer de nouveaux mots. En revanche,
  cet exercice devrait rester limité, car un nouveau mot engendre souvent un
  grand frein au [[changement]].

# Comment

## Règles de suggestion de [[changement]]

Pour définir une nouvelle simplification, il faut stipuler :

- le mot, le concept ou le groupe de mots qui est remplacé ;
- pourquoi cela nous semble plus simple ;
- les risques potentiels de cette modification ;
- d'où nous vient cette réflexion (par exemple : une autre langue fonctionne
  ainsi).

## Principes guides

- Un terme technique ne veut pas dire « mot compliqué ». Certaines disciplines
  possèdent des mots d'apparence simple dont la signification réelle est loin
  d'être évidente par rapport au [[contexte]] de la discipline. Un « groupe »
  en mathématiques est une structure algébrique aux propriétés bien
  particulières, sans rapport avec la notion de groupe entendue comme
  « collection d'objets ».
- L'idée n'est pas d'imposer des changements, mais de suggérer des usages.
- Un nom est pertinent en fonction du périmètre avec lequel on le regarde.
- Certains mots polysémiques peuvent être pointés sans pour autant qu'une
  alternative soit donnée, car il n'y a pas forcément d'alternative valable.

## Types de confusion que la simplistique essaie de corriger

1. Même mot pour des concepts qui n'ont rien à voir. Exemple : « mesure » pour
   dire « règlementation », confusant avec la [[mesure]] de mesurer.
2. Mot courant dont le sens technique est étranger au sens commun.
3. Deux termes présentés comme opposés alors qu'ils n'opposent rien de clair.
4. Nom hérité d'une personne ou d'une époque, qui n'évoque pas la chose.
5. Jargon dont la forme n'offre aucune prise pour deviner le sens.
```

## Annexe B — les cinq fiches de départ

Contenus rédigés depuis les exemples du manifeste. Ils sont volontairement
courts : Noël les réécrira, c'est son corpus. Chacun respecte les règles de
cohérence de la Tâche 6 (section `## Risques` présente, statut accordé aux
suggestions).

**`content/fiches/groupe-mathematiques.md`**

```markdown
---
terme: groupe
discipline: mathematiques
confusion: faux-ami-courant
statut: pointe
resume: >
  Mot du langage courant dont le sens technique n'a aucun rapport avec l'idée
  de collection d'objets.
suggestions: []
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

Un groupe, dans la langue ordinaire, c'est un ensemble de choses rassemblées.
En mathématiques, c'est un ensemble muni d'une opération vérifiant quatre
propriétés précises : fermeture, associativité, élément neutre, inverse. Le
mot ne dit rien de l'opération, qui est pourtant l'essentiel.

Le piège est pire que l'opacité : le lecteur croit comprendre. Il entend
« collection », il ne voit pas qu'on lui parle de structure.

## Suggestion

Aucune à ce stade. Les candidats évidents sont déjà pris : « structure » est
trop vague et désigne une famille entière d'objets, « ensemble opéré » est un
néologisme lourd pour un gain faible.

## Risques

Le terme est universel, présent dans chaque manuel depuis un siècle et demi,
et dans le nom de disciplines entières — théorie des groupes, groupes de Lie.
Le coût d'un changement serait colossal pour un bénéfice de clarté réel mais
modeste. Cette fiche existe pour nommer le problème, pas pour le résoudre.

## D'où ça vient

Galois parlait de « groupe de permutations », où le mot désignait bien une
collection concrète. L'abstraction est venue après, et le nom est resté.
```

**`content/fiches/actif-comptabilite.md`**

```markdown
---
terme: actif
discipline: comptabilite
confusion: faux-ami-courant
statut: propose
resume: >
  Adjectif courant employé comme nom pour désigner ce que l'entreprise
  possède, sans que rien dans le mot ne l'indique.
suggestions:
  - avoirs
  - ressources
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

« Actif » évoque l'action, l'activité, quelqu'un qui fait quelque chose. En
comptabilité, c'est ce que l'entreprise détient : trésorerie, stocks,
machines, créances. Un stock qui dort depuis trois ans est un actif, et il
n'est précisément pas actif.

Le mot est en outre la moitié d'une paire, actif et passif, qui suggère une
opposition entre faire et subir là où il s'agit en réalité d'avoirs et de
dettes.

## Suggestion

« Avoirs » dit ce que c'est, en un mot déjà français et déjà compris. Le
pluriel évite la confusion avec le verbe. « Ressources » est plus large et
plus neutre, mais aussi plus vague.

## Risques

Le mot est inscrit dans le plan comptable, dans la loi fiscale et dans les
états financiers normalisés. Aucune entreprise ne changera ses bilans parce
qu'une fiche le suggère. Le gain se situe ailleurs : dans l'enseignement, où
« avoirs et dettes » fait comprendre un bilan en une phrase, là où « actif et
passif » demande un cours.

## D'où ça vient

L'anglais dit *assets* et *liabilities*, qui n'oppose pas deux adjectifs
symétriques et se traduit directement par « avoirs » et « engagements ».
Beaucoup d'étudiants francophones comprennent le bilan plus vite en anglais.
```

**`content/fiches/passif-comptabilite.md`**

```markdown
---
terme: passif
discipline: comptabilite
confusion: paire-bancale
statut: propose
resume: >
  Fausse symétrie avec « actif » : la paire suggère une opposition entre agir
  et subir, là où il s'agit d'avoirs et de dettes.
suggestions:
  - dettes
  - engagements
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

Le problème n'est pas tant le mot seul que la paire qu'il forme. « Actif » et
« passif » se présentent comme deux contraires de même nature, ce qui pousse
le débutant à chercher une opposition active/passive inexistante. Il s'agit en
réalité de deux questions différentes : qu'est-ce que l'entreprise possède, et
à qui le doit-elle.

S'ajoute une difficulté : les capitaux propres figurent au passif sans être
une dette envers un tiers. La paire bancale rend ce point presque impossible à
expliquer simplement.

## Suggestion

« Dettes » pour la partie exigible, « engagements » si l'on veut englober les
capitaux propres. Dans les deux cas, on abandonne la symétrie trompeuse.

## Risques

Même objection que pour « actif » : le vocabulaire est normalisé. Et le risque
propre à cette fiche est de casser une paire mnémotechnique que beaucoup de
praticiens trouvent commode précisément parce qu'elle est symétrique.

## D'où ça vient

La symétrie vient du latin comptable italien, où la disposition en deux
colonnes importait plus que le sens des mots.
```

**`content/fiches/statique-escalade.md`**

```markdown
---
terme: statique
discipline: escalade
confusion: paire-bancale
statut: propose
resume: >
  Opposé à « dynamique » pour qualifier un mouvement, alors que les deux
  gestes sont en mouvement et que l'opposition réelle porte sur l'élan.
suggestions:
  - contrôlé
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

Un mouvement « statique » en escalade est un mouvement exécuté sans élan, par
la force, en gardant le contrôle à chaque instant. Il n'est pas immobile : on
se déplace, parfois longuement. « Statique » désigne en physique l'absence de
mouvement, ce qui est exactement le contraire de ce qui se passe.

La paire statique/dynamique est d'autant plus trompeuse qu'elle est continue
en pratique : la plupart des mouvements sont partiellement l'un et l'autre.

## Suggestion

« Contrôlé » dit ce qui compte — la maîtrise du geste — et laisse son
contraire naturel, « lancé », décrire l'autre cas. Le couple contrôlé/lancé
décrit la réalité sans contredire la physique.

## Risques

L'escalade est une discipline jeune dont le vocabulaire se fixe en ce moment,
ce qui rend le changement plus facile qu'en mathématiques — mais aussi plus
risqué : intervenir trop tôt, c'est figer un terme avant que la pratique ait
tranché. À surveiller plutôt qu'à imposer.

## D'où ça vient

Le vocabulaire de l'escalade a emprunté « statique » et « dynamique » à la
mécanique sans en reprendre le sens, probablement par l'intermédiaire du
jargon de l'assurage, où les termes qualifient la corde et y sont exacts.
```

**`content/fiches/mesure-theorie-musicale.md`**

```markdown
---
terme: mesure
discipline: theorie-musicale
confusion: polysemie-externe
statut: rejete
resume: >
  Le même mot désigne l'unité de découpage temporel, l'action de mesurer et
  une disposition règlementaire — parfois dans la même phrase.
suggestions: []
cree: 2026-10-03
modifie: 2026-10-03
---

## Pourquoi c'est confus

« Mesure » porte au moins trois sens courants : l'unité rythmique entre deux
barres, le résultat d'une mesure au sens de mesurer, et la disposition prise
par une autorité. En solfège, « mesurer une mesure » n'est pas une plaisanterie
mais une phrase possible.

## Suggestion

Aucune. Les candidats existants sont pires : « barre » désigne déjà le trait
vertical, « temps » désigne la subdivision interne, et un néologisme pour un
mot que tout musicien emploie depuis l'enfance serait un coût pur.

## Risques

C'est précisément le cas où le manifeste demande de ne rien faire : le coût du
changement dépasse largement le gain de clarté. La polysémie se résout en
pratique par le contexte, qui est toujours disponible — on parle de musique ou
on n'en parle pas.

Cette fiche est donc classée « rejeté » et non « pointé » : la réflexion a été
menée jusqu'au bout, et la conclusion est de garder le mot. Le signaler a
quand même une valeur : cela évite que quelqu'un refasse le travail.

## D'où ça vient

Le latin *mensura* a servi à tout, et le français a hérité du mot sans jamais
le spécialiser. L'anglais, qui distingue *bar* et *measure*, ne s'en sort pas
mieux : il a juste deux mots pour la même chose.
```

## Annexe C — `content/contribuer.md`

`<URL-DU-DEPOT>` est remplacé par l'adresse réelle à l'étape 7 de la Tâche 11.

```markdown
# Contribuer

Le corpus est ouvert. Il n'y a pas encore de comptes ni de votes sur ce site :
tout passe par le dépôt, où la discussion reste publique et tracée.

## Proposer une analyse

Ouvrir une *issue* ou une *pull request* sur <URL-DU-DEPOT>. Une pull request
obtient automatiquement une adresse de prévisualisation : la fiche se voit
rendue avant d'être intégrée.

## Ce qu'une proposition doit contenir

Les règles de suggestion du manifeste, appliquées :

1. **Le terme visé** — le mot, le concept ou le groupe de mots concerné, et la
   discipline.
2. **Pourquoi c'est confus** — en quoi le mot actuel induit en erreur. Dire
   « c'est compliqué » ne suffit pas : montrer le malentendu qu'il produit.
3. **La suggestion, s'il y en a une** — une ou plusieurs formulations. Pointer
   un terme sans proposer d'alternative est une contribution complète : il n'y
   a pas toujours de meilleur mot.
4. **Les risques** — ce que le changement coûterait, qui l'emploie déjà, ce
   qu'on casse. Une proposition sans risques identifiés est incomplète.
5. **D'où vient la réflexion** — une autre langue, une autre discipline, un
   témoignage d'enseignement.

## Ce qui sera probablement refusé

- Une suggestion sans risques identifiés.
- Un néologisme là où un mot français existant ferait l'affaire.
- Un renommage qui ferme la porte à de futurs concepts — par exemple appeler
  deux sous-concepts « le premier » et « le dernier » alors qu'un troisième
  pourrait apparaître.
- Un changement dont le coût dépasse visiblement le gain de clarté. Garder un
  mot imparfait est souvent la bonne réponse, et une analyse qui conclut en ce
  sens a toute sa place : elle est classée « rejeté ».

## Rappel d'intention

La simplistique suggère des usages, elle n'impose pas de changements. Le but
est d'abaisser la barrière à l'entrée des disciplines et de bâtir des ponts
entre elles — pas de corriger la langue de ceux qui les pratiquent.
```

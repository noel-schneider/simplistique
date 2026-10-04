# Chantiers de réforme — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à une fiche de mot de désigner un chantier — le document qui porte la réforme d'ensemble d'un corpus de mots — pour qu'un lecteur comprenne, avant de lire les suggestions, que ce terme ne se renomme pas seul.

**Architecture:** Un troisième type de contenu markdown dans `content/chantiers/`, chargé par un module qui calque `lib/content/fiches.ts`. Les fiches gagnent un champ optionnel `chantier`, validé contre les chantiers chargés et contre leur discipline. Une route statique `/chantiers/<slug>` s'ajoute aux douze existantes ; la carte et le vote ne changent pas.

**Tech Stack:** Next.js 16.3.8 (App Router), React 19.2.8, TypeScript 5.9.3, Zod 4.6.5, gray-matter, Tailwind CSS 4.3.3, Vitest 5.0.3 + @testing-library.

**Spec:** `docs/superpowers/specs/2026-10-04-chantiers-design.md`

## Global Constraints

- Tout le texte visible est en **français**, avec l'apostrophe courbe `’` (U+2019) écrite directement, sans entité ni échappement. `’` dans une chaîne JavaScript **n'est pas un bug** et ne doit jamais être « corrigé » en `\'`.
- Le code est en français : noms de fonctions, de variables, de fichiers. Exceptions : les conventions imposées par React et Next.js, et les mots-clés SQL.
- Les fichiers sont en **UTF-8**. Aucune manipulation d'octets, aucun `sed` sur du texte accentué : écrire directement, puis relire pour vérifier qu'aucun accent n'est corrompu.
- Le **slug d'un chantier est le nom de son fichier**, jamais un champ du front-matter. Même règle que les fiches.
- Une fiche appartient à **un chantier au plus** ; un chantier relève d'**une discipline exactement**.
- **Pas de statut sur un chantier.** Aucun champ `statut` dans le schéma d'un chantier.
- **La carte ne change pas** : aucun nœud, aucune enveloppe, aucune couleur de plus.
- **Le vote ne change pas** : on ne vote pas sur un chantier ; `/api/votes`, la table et la note de vie privée restent intacts.
- **Chaque page est générée au build.** `/api/votes` reste la seule route rendue à la demande, ce que `npm run verifier:statique` vérifie après le build.
- `resume` d'un chantier : non vide, **240 caractères au plus** (`LONGUEUR_MAX_RESUME`).
- Aucune dépendance nouvelle. Ne toucher ni `package.json`, ni `tsconfig.json`, ni `vitest.config.mts`, ni `next.config.ts`.
- Message de commit : sujet sur une ligne, **puis une ligne vide**, puis les trailers.
- **281 tests passent avant ce plan** (274 passants, 7 ignorés faute de PostgreSQL local). Aucun ne doit casser. `npm run test:once`, `npx tsc --noEmit`, `npm run lint`, `npm run lint:content`, `npm run build` et `npm run verifier:statique` doivent être verts à la fin de chaque tâche.

## Review Focus

Cinq entrées que la spec implique sans qu'aucune tâche ne les exerce spontanément. Chacune a son test, placé dans la tâche qui possède le code.

1. **Un fichier de chantier au nom invalide** (`Vocabulaire Du Bilan.md`, accents, majuscules) doit échouer avec un message qui nomme le fichier — Tâche 1.
2. **Deux fiches de disciplines différentes pointant le même chantier** : la seconde doit échouer, pas passer parce que la première a validé — Tâche 2.
3. **Un `chantier` présent mais vide** (`chantier: ''` ou `chantier:` seul) doit être refusé, pas traité comme absent — Tâche 2.
4. **Un slug de chantier inconnu dans l'URL du catalogue** (`?chantier=invente`) doit être ignoré silencieusement, comme les autres filtres, et ne pas vider la liste — Tâche 5.
5. **Une fiche sans chantier dans le contenu de secours** doit laisser sa case vide, sans tiret ni texte de remplacement qui se confondrait avec un nom de chantier — Tâche 6.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `lib/content/chantiers.ts` | Charger et valider les chantiers depuis le disque. Calque de `lib/content/fiches.ts`. |
| `lib/content/chantiers.test.ts` | Tests du chargement. |
| `content/chantiers/vocabulaire-du-bilan.md` | Le premier chantier réel. |
| `app/chantiers/[slug]/page.tsx` | La page d'un chantier. |
| `app/chantiers/[slug]/page.test.tsx` | Tests de la page. |
| `components/bandeau-chantier.tsx` | Le bandeau affiché en haut d'une fiche rattachée. |

**Modifiés :**

| Fichier | Changement |
|---|---|
| `lib/content/schema.ts` | `ChantierMeta`, `Chantier`, `creerSchemaChantier`, `chantier?` dans `FicheMeta`, second paramètre de `creerSchemaFiche`. |
| `lib/content/fiches.ts` | Faire circuler les chantiers jusqu'à la validation d'une fiche ; `chantier` dans l'index. |
| `app/fiches/[slug]/page.tsx` | Afficher le bandeau avant le corps. |
| `lib/filtrage.ts` | Critère `chantiers`, lecture et écriture d'URL, filtrage. |
| `lib/filtrage.test.ts` | Tests du nouveau critère. |
| `components/corpus.tsx` | Passer le groupe de filtres « chantier ». |
| `components/filtres.tsx` | Accepter la clé `chantiers`. |
| `components/catalogue-statique.tsx` | Colonne « Chantier ». |
| `app/fiches/page.tsx` | Charger les chantiers et les passer au catalogue. |
| `app/sitemap.ts` | Les pages de chantier. |
| `scripts/coherence.ts` | Les trois avertissements. |
| `scripts/coherence.test.ts` | Tests des avertissements. |
| `scripts/lint-content.ts` | Appeler la nouvelle vérification. |
| `content/fiches/actif-comptabilite.md`, `content/fiches/passif-comptabilite.md` | `chantier: vocabulaire-du-bilan`. |

---

## Task 1: Le schéma d'un chantier et son chargement

**Files:**
- Modify: `lib/content/schema.ts`
- Create: `lib/content/chantiers.ts`
- Test: `lib/content/chantiers.test.ts`

**Interfaces:**
- Consumes: `Taxonomies`, `LONGUEUR_MAX_RESUME`, `schemaSlug` de `lib/content/schema.ts` ; `DOSSIER_CONTENU`, `chargerTaxonomies` de `lib/content/taxonomies.ts`.
- Produces :

```ts
// lib/content/schema.ts
export type ChantierMeta = {
  slug: string
  nom: string
  discipline: string
  resume: string
  cree: Date
  modifie: Date
}
export type Chantier = ChantierMeta & { corps: string }
export function creerSchemaChantier(taxonomies: Taxonomies): ZodType<Omit<ChantierMeta, 'slug'>>

// lib/content/chantiers.ts
export function getChantiers(dossier?: string, taxonomies?: Taxonomies): Chantier[]
export function getChantier(slug: string, dossier?: string, taxonomies?: Taxonomies): Chantier | null
```

`getChantiers` rend une liste triée par `nom` (`localeCompare` en français), et une liste vide si le dossier n'existe pas. `getChantier` rend `null` pour un slug inconnu.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `lib/content/chantiers.test.ts` :

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getChantier, getChantiers } from './chantiers'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

const TAXONOMIES = chargerTaxonomies(DOSSIER_CONTENU)

let dossier: string

beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'simplistique-chantiers-'))
  mkdirSync(join(dossier, 'chantiers'), { recursive: true })
})

afterEach(() => {
  rmSync(dossier, { recursive: true, force: true })
})

function ecrire(fichier: string, contenu: string): void {
  writeFileSync(join(dossier, 'chantiers', fichier), contenu, 'utf8')
}

const VALIDE = `---
nom: Le vocabulaire du bilan
discipline: comptabilite
resume: Deux colonnes qui n’opposent rien de clair.
cree: 2026-10-04
modifie: 2026-10-04
---

## Risques

Le texte.
`

describe('getChantiers', () => {
  it('rend une liste vide quand le dossier n’existe pas', () => {
    expect(getChantiers(join(dossier, 'vide'), TAXONOMIES)).toEqual([])
  })

  it('lit un chantier et prend son slug dans le nom de fichier', () => {
    ecrire('vocabulaire-du-bilan.md', VALIDE)
    const chantiers = getChantiers(dossier, TAXONOMIES)
    expect(chantiers).toHaveLength(1)
    expect(chantiers[0].slug).toBe('vocabulaire-du-bilan')
    expect(chantiers[0].nom).toBe('Le vocabulaire du bilan')
    expect(chantiers[0].discipline).toBe('comptabilite')
    expect(chantiers[0].corps).toContain('## Risques')
  })

  it('trie par nom, en français', () => {
    ecrire('un.md', VALIDE.replace('Le vocabulaire du bilan', 'Les structures'))
    ecrire('deux.md', VALIDE.replace('Le vocabulaire du bilan', 'Épreuves'))
    expect(getChantiers(dossier, TAXONOMIES).map((c) => c.nom)).toEqual([
      'Épreuves',
      'Les structures',
    ])
  })

  // Review Focus nº 1 : un nom de fichier invalide doit nommer le fichier fautif.
  it('refuse un nom de fichier qui n’est pas un slug', () => {
    ecrire('Vocabulaire Du Bilan.md', VALIDE)
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/Vocabulaire Du Bilan\.md/)
  })

  it('refuse une discipline inconnue', () => {
    ecrire('x.md', VALIDE.replace('comptabilite', 'alchimie'))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/discipline/)
  })

  it('refuse un résumé plus long que la limite', () => {
    ecrire('x.md', VALIDE.replace('Deux colonnes qui n’opposent rien de clair.', 'a'.repeat(241)))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/resume/)
  })

  it('refuse une date de modification antérieure à la création', () => {
    ecrire('x.md', VALIDE.replace('modifie: 2026-10-04', 'modifie: 2026-10-01'))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/modifie/)
  })
})

describe('getChantier', () => {
  it('rend null pour un slug inconnu', () => {
    expect(getChantier('absent', dossier, TAXONOMIES)).toBeNull()
  })

  it('rend le chantier demandé', () => {
    ecrire('vocabulaire-du-bilan.md', VALIDE)
    expect(getChantier('vocabulaire-du-bilan', dossier, TAXONOMIES)?.nom).toBe(
      'Le vocabulaire du bilan',
    )
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/content/chantiers.test.ts`
Expected: FAIL — `Failed to resolve import "./chantiers"`

- [ ] **Step 3: Ajouter le schéma dans `lib/content/schema.ts`**

Après le bloc `export type Fiche = FicheMeta & { corps: string }` et la constante `LONGUEUR_MAX_RESUME`, ajouter :

```ts
export type ChantierMeta = {
  slug: string
  nom: string
  discipline: string
  resume: string
  cree: Date
  modifie: Date
}

export type Chantier = ChantierMeta & { corps: string }

export function creerSchemaChantier(taxonomies: Taxonomies): ZodType<Omit<ChantierMeta, 'slug'>> {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]

  return z
    .object({
      nom: z.string().min(1),
      discipline: z.enum(disciplines),
      // Même traitement que le résumé d'une fiche : les scalaires `>` du YAML
      // gardent un saut de ligne final, qui partirait tel quel dans la
      // méta-description et consommerait un caractère du budget pour rien.
      resume: z.string().trim().min(1).max(LONGUEUR_MAX_RESUME),
      cree: z.coerce.date(),
      modifie: z.coerce.date(),
    })
    .refine((chantier) => chantier.modifie >= chantier.cree, {
      path: ['modifie'],
      message: 'modifie est antérieure à cree',
    })
}
```

- [ ] **Step 4: Écrire `lib/content/chantiers.ts`**

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { creerSchemaChantier, schemaSlug, type Chantier, type Taxonomies } from './schema'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

function lireChantier(dossier: string, fichier: string, taxonomies: Taxonomies): Chantier {
  const slug = fichier.replace(/\.md$/, '')
  if (!schemaSlug.test(slug)) {
    throw new Error(
      `${fichier} : slug de chantier invalide (« ${slug} ») — le nom de fichier doit être en minuscules, sans accent, sans espace, avec uniquement des chiffres et des tirets`,
    )
  }

  const chemin = join(dossier, 'chantiers', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaChantier(taxonomies).safeParse(data)

  if (!resultat.success) {
    const details = resultat.error.issues
      .map((probleme) => `${probleme.path.join('.') || '(racine)'} : ${probleme.message}`)
      .join(' ; ')
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug, ...resultat.data, corps: content }
}

export function getChantiers(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Chantier[] {
  const dossierChantiers = join(dossier, 'chantiers')
  if (!existsSync(dossierChantiers)) return []

  return readdirSync(dossierChantiers)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireChantier(dossier, f, taxonomies))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

export function getChantier(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Chantier | null {
  const fichier = `${slug}.md`
  if (!existsSync(join(dossier, 'chantiers', fichier))) return null
  return lireChantier(dossier, fichier, taxonomies)
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm run test:once lib/content/chantiers.test.ts`
Expected: PASS — les neuf tests réussissent.

- [ ] **Step 6: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint`
Expected: 281 tests passants + 7 ignorés ; `tsc` et `lint` muets.

- [ ] **Step 7: Commit**

```bash
git add lib/content/schema.ts lib/content/chantiers.ts lib/content/chantiers.test.ts
git commit -m "feat(chantiers): schéma et chargement d'un chantier"
```

---

## Task 2: Le champ `chantier` d'une fiche et sa validation croisée

**Files:**
- Modify: `lib/content/schema.ts`
- Modify: `lib/content/fiches.ts`
- Test: `lib/content/fiches.test.ts`

**Interfaces:**
- Consumes: `ChantierMeta`, `creerSchemaChantier` (Tâche 1) ; `getChantiers` de `lib/content/chantiers.ts`.
- Produces :

```ts
// lib/content/schema.ts
export type FicheMeta = { /* … champs existants … */ chantier?: string }
export function creerSchemaFiche(
  taxonomies: Taxonomies,
  chantiers?: ChantierMeta[],
): ZodType<Omit<FicheMeta, 'slug'>>

// lib/content/fiches.ts — troisième paramètre optionnel sur les trois fonctions
export function getFiches(dossier?: string, taxonomies?: Taxonomies, chantiers?: ChantierMeta[]): Fiche[]
export function getFiche(slug: string, dossier?: string, taxonomies?: Taxonomies, chantiers?: ChantierMeta[]): Fiche | null
export function getIndex(dossier?: string, taxonomies?: Taxonomies, chantiers?: ChantierMeta[]): FicheIndex[]
```

`chantiers` vaut par défaut `getChantiers(dossier, taxonomies)`. `FicheIndex` dérive de `FicheMeta` : le champ y apparaît sans autre intervention.

**Pourquoi un `superRefine` et non un `z.enum` :** l'appariement à vérifier porte sur **deux** champs à la fois — le chantier doit exister *et* relever de la même discipline que la fiche —, ce qu'un `enum` sur le seul champ `chantier` ne peut pas exprimer. Et `z.enum` exige une liste non vide : avec zéro chantier dans le corpus, il ne compilerait même pas.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `lib/content/fiches.test.ts`, à la fin du fichier :

```ts
describe('le champ chantier d’une fiche', () => {
  const CHANTIERS = [
    {
      slug: 'vocabulaire-du-bilan',
      nom: 'Le vocabulaire du bilan',
      discipline: 'comptabilite',
      resume: 'court',
      cree: new Date('2026-10-04'),
      modifie: new Date('2026-10-04'),
    },
  ]

  it('accepte une fiche sans chantier, et laisse le champ absent', () => {
    const fiche = getFiche('groupe-mathematiques', DOSSIER_CONTENU, undefined, CHANTIERS)
    expect(fiche?.chantier).toBeUndefined()
  })

  it('refuse un chantier qui n’existe pas', () => {
    expect(() =>
      lireFicheDeTest({ discipline: 'comptabilite', chantier: 'invente' }, CHANTIERS),
    ).toThrow(/chantier.*invente/s)
  })

  // Review Focus nº 2 : la seconde fiche doit échouer pour elle-même, et non
  // passer parce qu’une fiche précédente a validé le même chantier.
  it('refuse un chantier d’une autre discipline', () => {
    expect(() =>
      lireFicheDeTest({ discipline: 'mathematiques', chantier: 'vocabulaire-du-bilan' }, CHANTIERS),
    ).toThrow(/discipline/)
  })

  // Review Focus nº 3 : présent mais vide n’est pas la même chose qu’absent.
  it('refuse un chantier vide', () => {
    expect(() => lireFicheDeTest({ discipline: 'comptabilite', chantier: '' }, CHANTIERS)).toThrow(
      /chantier/,
    )
  })

  it('porte le chantier jusque dans l’index', () => {
    const index = getIndex(DOSSIER_CONTENU, undefined, CHANTIERS)
    expect(index.every((entree) => 'chantier' in entree)).toBe(true)
  })
})
```

Et, au-dessus de ce `describe`, l'utilitaire qui écrit une fiche de test dans un dossier temporaire :

```ts
function lireFicheDeTest(champs: Record<string, unknown>, chantiers: ChantierMeta[]): Fiche {
  const dossier = mkdtempSync(join(tmpdir(), 'simplistique-fiche-'))
  try {
    mkdirSync(join(dossier, 'fiches'), { recursive: true })
    const entete = Object.entries({
      terme: 'essai',
      discipline: 'comptabilite',
      confusion: 'faux-ami-courant',
      statut: 'pointe',
      resume: 'court',
      suggestions: [],
      cree: '2026-10-04',
      modifie: '2026-10-04',
      ...champs,
    })
      .map(([cle, valeur]) => `${cle}: ${JSON.stringify(valeur)}`)
      .join('\n')
    writeFileSync(
      join(dossier, 'fiches', 'essai-comptabilite.md'),
      `---\n${entete}\n---\n\n## Risques\n\ntexte\n`,
      'utf8',
    )
    const fiche = getFiche('essai-comptabilite', dossier, chargerTaxonomies(DOSSIER_CONTENU), chantiers)
    if (!fiche) throw new Error('fiche de test introuvable')
    return fiche
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
}
```

Compléter les imports du fichier de test : `mkdirSync`, `mkdtempSync`, `rmSync`, `writeFileSync` depuis `node:fs`, `tmpdir` depuis `node:os`, `join` depuis `node:path`, et les types `Fiche` et `ChantierMeta` depuis `./schema`.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/content/fiches.test.ts`
Expected: FAIL — `getFiche` n'accepte pas de quatrième argument, et `chantier` n'existe pas dans le schéma.

- [ ] **Step 3: Étendre le schéma d'une fiche**

Dans `lib/content/schema.ts`, ajouter le champ au type :

```ts
export type FicheMeta = {
  slug: string
  terme: string
  discipline: string
  confusion: string
  statut: Statut
  resume: string
  suggestions: string[]
  /** Le slug d’un chantier de la même discipline, ou rien. */
  chantier?: string
  cree: Date
  modifie: Date
}
```

puis remplacer `creerSchemaFiche` par :

```ts
export function creerSchemaFiche(
  taxonomies: Taxonomies,
  chantiers: ChantierMeta[] = [],
): ZodType<Omit<FicheMeta, 'slug'>> {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]
  const confusions = taxonomies.confusions.map((c) => c.slug) as [string, ...string[]]

  return z
    .object({
      terme: z.string().min(1),
      discipline: z.enum(disciplines),
      confusion: z.enum(confusions),
      statut: z.enum(STATUTS),
      // Les scalaires `>` du YAML gardent un saut de ligne final, qui partirait
      // tel quel dans <meta name="description"> et consommerait un caractère
      // du budget de 240 pour rien.
      resume: z.string().trim().min(1).max(LONGUEUR_MAX_RESUME),
      suggestions: z.array(z.string().min(1)),
      // Pas un `z.enum` : l’appariement à vérifier porte sur deux champs à la
      // fois — le chantier doit exister ET relever de la même discipline — ce
      // qu’un enum sur le seul champ ne sait pas dire. Et `z.enum` exige une
      // liste non vide, impossible à garantir avec zéro chantier au corpus.
      chantier: z.string().min(1, 'chantier vide : retirer le champ plutôt que le laisser vide').optional(),
      cree: z.coerce.date(),
      modifie: z.coerce.date(),
    })
    .superRefine((fiche, ctx) => {
      if (fiche.chantier === undefined) return

      const chantier = chantiers.find((c) => c.slug === fiche.chantier)
      if (!chantier) {
        ctx.addIssue({
          code: 'custom',
          path: ['chantier'],
          message: `chantier inconnu « ${fiche.chantier} » — aucun fichier content/chantiers/${fiche.chantier}.md`,
        })
        return
      }

      if (chantier.discipline !== fiche.discipline) {
        ctx.addIssue({
          code: 'custom',
          path: ['chantier'],
          message: `le chantier « ${fiche.chantier} » relève de la discipline « ${chantier.discipline} », la fiche de « ${fiche.discipline} » — une fiche ne peut rejoindre qu’un chantier de sa propre discipline`,
        })
      }
    })
}
```

- [ ] **Step 4: Faire circuler les chantiers dans `lib/content/fiches.ts`**

Ajouter l'import `import { getChantiers } from './chantiers'` et le type `ChantierMeta` à l'import de `./schema`, puis :

```ts
function lireFiche(
  dossier: string,
  fichier: string,
  taxonomies: Taxonomies,
  chantiers: ChantierMeta[],
): Fiche {
```

et, dans son corps, remplacer `creerSchemaFiche(taxonomies)` par `creerSchemaFiche(taxonomies, chantiers)`.

Puis les trois fonctions publiques :

```ts
export function getFiches(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): Fiche[] {
  const dossierFiches = join(dossier, 'fiches')
  if (!existsSync(dossierFiches)) return []

  return readdirSync(dossierFiches)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireFiche(dossier, f, taxonomies, chantiers))
    .sort((a, b) => a.terme.localeCompare(b.terme, 'fr'))
}

export function getFiche(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): Fiche | null {
  const fichier = `${slug}.md`
  const chemin = join(dossier, 'fiches', fichier)
  if (!existsSync(chemin)) return null
  return lireFiche(dossier, fichier, taxonomies, chantiers)
}

export function getIndex(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): FicheIndex[] {
  return getFiches(dossier, taxonomies, chantiers).map((fiche) => ({
    slug: fiche.slug,
    terme: fiche.terme,
    discipline: fiche.discipline,
    confusion: fiche.confusion,
    statut: fiche.statut,
    resume: fiche.resume,
    suggestions: fiche.suggestions,
    chantier: fiche.chantier,
  }))
}
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once lib/content`
Expected: PASS — les cinq nouveaux tests réussissent, les anciens aussi.

- [ ] **Step 6: Vérifier par sabotage que les deux erreurs fatales le sont vraiment**

Retirer temporairement le bloc `if (!chantier) { … }` du `superRefine`, relancer `npm run test:once lib/content/fiches.test.ts`, et constater que « refuse un chantier qui n'existe pas » tombe. Restaurer. Faire de même avec le bloc de comparaison des disciplines et le test correspondant. **Donner les deux sorties dans le rapport.**

- [ ] **Step 7: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run lint:content && npm run build && npm run verifier:statique`
Expected: tout vert ; `lint:content` ne signale rien sur le corpus réel, qui n'a encore aucun chantier.

- [ ] **Step 8: Commit**

```bash
git add lib/content/schema.ts lib/content/fiches.ts lib/content/fiches.test.ts
git commit -m "feat(chantiers): champ chantier d'une fiche et validation croisée"
```

---

## Task 3: Le premier chantier réel et sa page

**Files:**
- Create: `content/chantiers/vocabulaire-du-bilan.md`
- Modify: `content/fiches/actif-comptabilite.md`, `content/fiches/passif-comptabilite.md`
- Create: `app/chantiers/[slug]/page.tsx`
- Test: `app/chantiers/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: `getChantier`, `getChantiers` (Tâche 1) ; `getFiches` (Tâche 2) ; `rendreMarkdown` de `lib/content/markdown.ts` ; `Prose` de `components/prose.tsx` ; `BadgeStatut` de `components/badge-statut.tsx`.
- Produces: la route `/chantiers/<slug>`.

**Pourquoi le contenu réel arrive dans cette tâche et pas plus tard :** `npm run verifier:statique` échoue sur une route paramétrée dont aucune page n'est pré-générée. Créer `app/chantiers/[slug]/` sans un seul chantier dans `content/` casserait donc la vérification du site statique.

- [ ] **Step 1: Écrire le chantier**

Créer `content/chantiers/vocabulaire-du-bilan.md` :

```markdown
---
nom: Le vocabulaire du bilan
discipline: comptabilite
resume: >
  Les deux colonnes du bilan portent des adjectifs substantivés qui
  n’opposent rien de clair, et aucune ne se renomme sans l’autre.
cree: 2026-10-04
modifie: 2026-10-04
---

## Pourquoi c’est confus

Un bilan a deux colonnes. L’une recense ce que l’entreprise possède, l’autre ce qu’elle
doit. On les appelle « actif » et « passif » — deux adjectifs du langage courant,
substantivés, dont l’opposition ordinaire n’a aucun rapport avec celle qu’ils désignent
ici. Rien, dans le fait d’être actif plutôt que passif, n’évoque la différence entre
posséder et devoir.

Le lecteur qui découvre un bilan cherche donc le sens dans les mots, ne le trouve pas, et
conclut que la comptabilité est difficile. Elle ne l’est pas : c’est son vocabulaire
d’entrée qui l’est.

## Ce qu’une réforme demanderait

Les deux termes ne se corrigent pas séparément. Renommer « actif » en « avoirs » sans
toucher à « passif » laisserait une paire encore plus bancale : un nom concret face à un
adjectif substantivé. C’est l’appariement qui porte le sens — « avoirs et dettes » se
comprend sans cours, « avoirs et passif » ne se comprend pas du tout.

Une réforme cohérente remplace donc les deux ensemble, et choisit deux mots qui
s’opposent réellement dans la langue ordinaire.

## Risques

Le vocabulaire du bilan est inscrit dans le plan comptable, dans la loi fiscale et dans
les états financiers normalisés. Aucune entreprise ne changera ses documents parce qu’un
site le suggère, et ce chantier ne le demande pas.

Le gain se situe dans l’enseignement et dans la vulgarisation, où rien n’oblige à
reprendre les termes officiels pour expliquer ce qu’ils désignent. Un manuel qui écrit
« avoirs et dettes » en première page, puis signale que la profession dit « actif et
passif », fait comprendre un bilan en une phrase.
```

- [ ] **Step 2: Rattacher les deux fiches**

Dans `content/fiches/actif-comptabilite.md` et `content/fiches/passif-comptabilite.md`, ajouter au front-matter, après la ligne `confusion:` :

```yaml
chantier: vocabulaire-du-bilan
```

- [ ] **Step 3: Écrire le test qui échoue**

Créer `app/chantiers/[slug]/page.test.tsx` :

```tsx
import { describe, expect, it } from 'vitest'
import PageChantier, { generateMetadata, generateStaticParams } from './page'

describe('generateStaticParams', () => {
  it('énumère les chantiers du corpus', () => {
    expect(generateStaticParams()).toContainEqual({ slug: 'vocabulaire-du-bilan' })
  })
})

describe('generateMetadata', () => {
  it('reprend le nom en titre et le résumé en description', async () => {
    const metadonnees = await generateMetadata({
      params: Promise.resolve({ slug: 'vocabulaire-du-bilan' }),
    })
    expect(metadonnees.title).toBe('Le vocabulaire du bilan')
    expect(metadonnees.description).toContain('n’opposent rien de clair')
  })

  it('rend un objet vide pour un slug inconnu', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ slug: 'absent' }) })).toEqual({})
  })
})

describe('PageChantier', () => {
  it('liste les fiches du chantier, et elles seules', async () => {
    const page = await PageChantier({
      params: Promise.resolve({ slug: 'vocabulaire-du-bilan' }),
    })
    const rendu = JSON.stringify(page)
    expect(rendu).toContain('actif')
    expect(rendu).toContain('passif')
    // « groupe » relève des mathématiques : aucune raison d’apparaître ici.
    expect(rendu).not.toContain('groupe')
  })
})
```

- [ ] **Step 4: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once "app/chantiers/[slug]/page.test.tsx"`
Expected: FAIL — `Failed to resolve import "./page"`

- [ ] **Step 5: Écrire la page**

Créer `app/chantiers/[slug]/page.tsx` :

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeStatut } from '@/components/badge-statut'
import { Prose } from '@/components/prose'
import { getChantier, getChantiers } from '@/lib/content/chantiers'
import { getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

// Même raison que pour la page d’une fiche : `generateMetadata` et le composant
// sont deux invocations distinctes pour le même chantier, et chacune a besoin
// des taxonomies. `cache` les mémoïse pour la durée du rendu de cette route.
const taxonomiesDeLaRequete = cache(() => chargerTaxonomies())

// Sans cela, un slug absent de la liste ci-dessous déclencherait un rendu à la
// demande. La contrainte globale « chaque page est générée au build » l’interdit.
export const dynamicParams = false

export function generateStaticParams() {
  return getChantiers().map((chantier) => ({ slug: chantier.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const chantier = getChantier((await params).slug, undefined, taxonomiesDeLaRequete())
  if (!chantier) return {}
  return {
    title: chantier.nom,
    description: chantier.resume,
    openGraph: { title: chantier.nom, description: chantier.resume, type: 'article' },
  }
}

export default async function PageChantier({ params }: Params) {
  const taxonomies = taxonomiesDeLaRequete()
  const chantier = getChantier((await params).slug, undefined, taxonomies)
  if (!chantier) notFound()

  const nomDiscipline =
    taxonomies.disciplines.find((d) => d.slug === chantier.discipline)?.nom ?? chantier.discipline
  const nomStatut = (slug: string) =>
    taxonomies.statuts.find((s) => s.slug === slug)?.nom ?? slug

  const fiches = getFiches().filter((fiche) => fiche.chantier === chantier.slug)

  return (
    <article>
      <header className="mb-8 space-y-4 border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{chantier.nom}</h1>
        <p className="text-lg leading-relaxed text-stone-700">{chantier.resume}</p>
        <Link
          href={`/fiches?discipline=${chantier.discipline}`}
          className="text-sm text-stone-600 underline hover:text-stone-900"
        >
          {nomDiscipline}
        </Link>
      </header>

      <Prose html={await rendreMarkdown(chantier.corps)} />

      {/* La liste vient après le texte : on descend de l’argument d’ensemble
          vers les cas particuliers, jamais l’inverse. */}
      <section className="mt-8 space-y-3 border-t border-stone-200 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {fiches.length > 1 ? 'Les termes de ce chantier' : 'Le terme de ce chantier'}
        </h2>
        {fiches.map((fiche) => (
          <div key={fiche.slug} className="space-y-1">
            <p className="flex flex-wrap items-center gap-3">
              <Link
                href={`/fiches/${fiche.slug}`}
                className="font-medium underline hover:text-stone-600"
              >
                {fiche.terme}
              </Link>
              <BadgeStatut statut={fiche.statut} nom={nomStatut(fiche.statut)} />
            </p>
            <p className="text-sm text-stone-600">{fiche.resume}</p>
          </div>
        ))}
      </section>
    </article>
  )
}
```

- [ ] **Step 6: Lancer le test et vérifier qu'il passe**

Run: `npm run test:once "app/chantiers/[slug]/page.test.tsx"`
Expected: PASS — les quatre tests réussissent.

- [ ] **Step 7: Vérifier que le site reste statique**

Run: `npm run build && npm run verifier:statique`
Expected: la sortie du build montre `/chantiers/[slug]` avec sa page `●`, et `verifier:statique` affiche « Le site reste statique : /api/votes est la seule route rendue à la demande. » **Donner les deux sorties dans le rapport.**

- [ ] **Step 8: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run lint:content`
Expected: tout vert.

- [ ] **Step 9: Commit**

```bash
git add content/chantiers content/fiches app/chantiers
git commit -m "feat(chantiers): le vocabulaire du bilan et la page d'un chantier"
```

---

## Task 4: Le bandeau sur la fiche

**Files:**
- Create: `components/bandeau-chantier.tsx`
- Modify: `app/fiches/[slug]/page.tsx`
- Test: `app/fiches/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: `getChantier` (Tâche 1) ; le champ `fiche.chantier` (Tâche 2).
- Produces :

```tsx
export function BandeauChantier({ slug, nom }: { slug: string; nom: string }): ReactElement
```

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `app/fiches/[slug]/page.test.tsx`, à la fin du `describe('PageFiche')` :

```tsx
  it('affiche le bandeau du chantier AVANT le corps de la fiche', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'actif-comptabilite' }) })
    const enfants = (page as ReactElement<{ children: ReactNode[] }>).props.children
    const plat = (Array.isArray(enfants) ? enfants : [enfants]).filter(isValidElement)

    const rangBandeau = plat.findIndex((e) => e.type === BandeauChantier)
    const rangCorps = plat.findIndex((e) => e.type === Prose)

    // La position est une exigence de la spec, pas une préférence : un bandeau
    // placé après les suggestions arriverait quand le lecteur s’est déjà fait
    // un avis, c’est-à-dire trop tard pour servir à quelque chose.
    expect(rangBandeau).toBeGreaterThanOrEqual(0)
    expect(rangBandeau).toBeLessThan(rangCorps)
  })

  it('n’affiche aucun bandeau pour une fiche sans chantier', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'groupe-mathematiques' }) })
    const enfants = (page as ReactElement<{ children: ReactNode[] }>).props.children
    const plat = (Array.isArray(enfants) ? enfants : [enfants]).filter(isValidElement)
    expect(plat.some((e) => e.type === BandeauChantier)).toBe(false)
  })
```

Compléter les imports du fichier de test avec `BandeauChantier` depuis `@/components/bandeau-chantier` et `Prose` depuis `@/components/prose`.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once "app/fiches/[slug]/page.test.tsx"`
Expected: FAIL — `Failed to resolve import "@/components/bandeau-chantier"`

- [ ] **Step 3: Écrire le composant**

Créer `components/bandeau-chantier.tsx` :

```tsx
import Link from 'next/link'

/**
 * Affiché en haut d’une fiche rattachée, avant son corps. La position est une
 * exigence de la spec : le lecteur doit savoir que le mot ne se renomme pas seul
 * AVANT de lire les suggestions, sinon l’avertissement arrive quand il s’est
 * déjà fait un avis.
 */
export function BandeauChantier({ slug, nom }: { slug: string; nom: string }) {
  return (
    <aside className="mb-8 rounded border border-stone-300 bg-stone-100 px-4 py-3 text-sm">
      <p className="text-stone-700">
        Ce terme ne se renomme pas seul : il fait partie d’une réforme plus large,{' '}
        <Link href={`/chantiers/${slug}`} className="font-medium underline hover:text-stone-900">
          {nom}
        </Link>
        .
      </p>
    </aside>
  )
}
```

- [ ] **Step 4: Brancher le bandeau dans la page de fiche**

Dans `app/fiches/[slug]/page.tsx`, ajouter les imports :

```tsx
import { BandeauChantier } from '@/components/bandeau-chantier'
import { getChantier } from '@/lib/content/chantiers'
```

puis, dans `PageFiche`, après la ligne `if (!fiche) notFound()` :

```tsx
  const chantier = fiche.chantier ? getChantier(fiche.chantier, undefined, taxonomies) : null
```

et insérer le bandeau entre `<EnteteFiche …/>` et `<Prose …/>` :

```tsx
      {chantier && <BandeauChantier slug={chantier.slug} nom={chantier.nom} />}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm run test:once "app/fiches/[slug]/page.test.tsx"`
Expected: PASS — les six tests réussissent.

- [ ] **Step 6: Vérifier par sabotage que la position est réellement tenue**

Déplacer temporairement la ligne du bandeau **après** `<Prose …/>`, relancer le test, et constater que « affiche le bandeau du chantier AVANT le corps » tombe. Restaurer. **Donner la sortie dans le rapport.**

- [ ] **Step 7: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run build && npm run verifier:statique`
Expected: tout vert.

- [ ] **Step 8: Commit**

```bash
git add components/bandeau-chantier.tsx "app/fiches/[slug]"
git commit -m "feat(chantiers): bandeau de chantier en haut de la fiche"
```

---

## Task 5: Le filtre « chantier » du catalogue

**Files:**
- Modify: `lib/filtrage.ts`
- Test: `lib/filtrage.test.ts`
- Modify: `components/filtres.tsx`, `components/corpus.tsx`, `app/fiches/page.tsx`

**Interfaces:**
- Consumes: `FicheIndex` avec son champ `chantier` (Tâche 2) ; `getChantiers` (Tâche 1).
- Produces :

```ts
export type Criteres = { disciplines: string[]; confusions: string[]; statuts: string[]; chantiers: string[]; q: string }
export type SlugsValides = { disciplines: string[]; confusions: string[]; statuts: string[]; chantiers: string[] }
```

Le paramètre d'URL s'écrit `chantier` au singulier, comme `discipline`, `confusion` et `statut`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `lib/filtrage.test.ts` :

```ts
describe('le critère chantier', () => {
  const VALIDES = {
    disciplines: ['comptabilite', 'mathematiques'],
    confusions: ['faux-ami-courant'],
    statuts: ['pointe', 'propose'],
    chantiers: ['vocabulaire-du-bilan'],
  }

  const INDEX = [
    { slug: 'actif-comptabilite', terme: 'actif', discipline: 'comptabilite', confusion: 'faux-ami-courant', statut: 'propose' as const, resume: 'a', suggestions: [], chantier: 'vocabulaire-du-bilan' },
    { slug: 'groupe-mathematiques', terme: 'groupe', discipline: 'mathematiques', confusion: 'faux-ami-courant', statut: 'pointe' as const, resume: 'b', suggestions: [] },
  ]

  it('lit le paramètre chantier de l’URL', () => {
    const criteres = analyserCriteres(
      new URLSearchParams('chantier=vocabulaire-du-bilan'),
      VALIDES,
    )
    expect(criteres.chantiers).toEqual(['vocabulaire-du-bilan'])
  })

  // Review Focus nº 4 : un slug inconnu est ignoré, comme pour les autres filtres.
  it('ignore un slug de chantier inconnu', () => {
    expect(analyserCriteres(new URLSearchParams('chantier=invente'), VALIDES).chantiers).toEqual([])
  })

  it('réécrit le critère dans l’URL', () => {
    expect(
      ecrireCriteres({ ...CRITERES_VIDES, chantiers: ['vocabulaire-du-bilan'] }),
    ).toBe('chantier=vocabulaire-du-bilan')
  })

  it('compte comme un filtre actif', () => {
    expect(aUnFiltre({ ...CRITERES_VIDES, chantiers: ['vocabulaire-du-bilan'] })).toBe(true)
  })

  it('ne garde que les fiches du chantier demandé', () => {
    const filtrees = filtrerFiches(INDEX, { ...CRITERES_VIDES, chantiers: ['vocabulaire-du-bilan'] })
    expect(filtrees.map((f) => f.slug)).toEqual(['actif-comptabilite'])
  })

  it('ne retire rien quand aucun chantier n’est demandé', () => {
    expect(filtrerFiches(INDEX, CRITERES_VIDES)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once lib/filtrage.test.ts`
Expected: FAIL — `chantiers` n'existe pas sur `Criteres`.

- [ ] **Step 3: Étendre `lib/filtrage.ts`**

Quatre modifications, toutes mécaniques :

```ts
export type Criteres = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
  chantiers: string[]
  q: string
}

export type SlugsValides = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
  chantiers: string[]
}

export const CRITERES_VIDES: Criteres = {
  disciplines: [],
  confusions: [],
  statuts: [],
  chantiers: [],
  q: '',
}
```

Dans `analyserCriteres`, ajouter la ligne :

```ts
    chantiers: lireListe(params, 'chantier', valides.chantiers),
```

Dans `ecrireCriteres`, après la ligne des statuts :

```ts
  if (criteres.chantiers.length) params.set('chantier', criteres.chantiers.join(','))
```

Dans `aUnFiltre`, ajouter `criteres.chantiers.length > 0 ||` à la disjonction.

Dans `filtrerFiches`, après le test des confusions :

```ts
    if (criteres.chantiers.length && (!fiche.chantier || !criteres.chantiers.includes(fiche.chantier)))
      return false
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npm run test:once lib/filtrage.test.ts`
Expected: PASS.

- [ ] **Step 5: Brancher le filtre dans l'interface**

Dans `components/filtres.tsx`, étendre la clé du type `Groupe` :

```ts
type Groupe = {
  cle: 'disciplines' | 'confusions' | 'statuts' | 'chantiers'
  libelle: string
  entrees: { slug: string; nom: string }[]
}
```

Dans `components/corpus.tsx`, trois modifications. La signature :

```tsx
export function Corpus({
  index,
  disciplines,
  confusions,
  statuts,
  chantiers,
}: {
  index: FicheIndex[]
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
  chantiers: { slug: string; nom: string }[]
}) {
```

Les slugs valides — la dépendance du `useMemo` doit suivre, faute de quoi un
changement de chantiers ne serait jamais pris en compte :

```tsx
  const valides = useMemo(
    () => ({
      disciplines: disciplines.map((d) => d.slug),
      confusions: confusions.map((c) => c.slug),
      statuts: statuts.map((s) => s.slug),
      chantiers: chantiers.map((c) => c.slug),
    }),
    [disciplines, confusions, statuts, chantiers],
  )
```

Et le quatrième groupe de filtres, à la suite des trois existants :

```tsx
        groupes={[
          { cle: 'disciplines', libelle: 'Discipline', entrees: disciplines },
          { cle: 'confusions', libelle: 'Confusion', entrees: confusions },
          { cle: 'statuts', libelle: 'Statut', entrees: statuts },
          { cle: 'chantiers', libelle: 'Chantier', entrees: chantiers },
        ]}
```

Dans `app/fiches/page.tsx`, charger les chantiers et les passer :

```tsx
import { getChantiers } from '@/lib/content/chantiers'
```

```tsx
  const chantiers = getChantiers().map((c) => ({ slug: c.slug, nom: c.nom }))
```

```tsx
        <Corpus
          index={index}
          disciplines={disciplines}
          confusions={confusions}
          statuts={statuts}
          chantiers={chantiers}
        />
```

- [ ] **Step 6: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run build && npm run verifier:statique`
Expected: tout vert. Les tests existants de `components/corpus.test.tsx` doivent passer sans modification ; s'ils échouent faute de la nouvelle propriété, leur ajouter `chantiers={[]}` et rien d'autre.

- [ ] **Step 7: Commit**

```bash
git add lib/filtrage.ts lib/filtrage.test.ts components app/fiches/page.tsx
git commit -m "feat(chantiers): filtre chantier dans le catalogue"
```

---

## Task 6: La colonne du contenu de secours et le plan de site

**Files:**
- Modify: `components/catalogue-statique.tsx`
- Test: `components/catalogue-statique.test.tsx`
- Modify: `app/fiches/page.tsx`
- Modify: `app/sitemap.ts`
- Test: `app/sitemap.test.ts`

**Interfaces:**
- Consumes: `FicheIndex.chantier` (Tâche 2) ; `getChantiers` (Tâche 1).
- Produces: rien de nouveau.

**Ce composant ne filtre pas, et ne doit pas se mettre à filtrer :** il montre le corpus entier et annonce que les filtres arrivent avec l'interface interactive. Il gagne une colonne, pas un filtre.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `components/catalogue-statique.test.tsx` :

```tsx
  it('montre le chantier d’une fiche, et laisse la case vide sinon', () => {
    render(
      <CatalogueStatique
        index={[
          { slug: 'actif-comptabilite', terme: 'actif', discipline: 'comptabilite', confusion: 'faux-ami-courant', statut: 'propose' as const, resume: 'a', suggestions: [], chantier: 'vocabulaire-du-bilan' },
          { slug: 'groupe-mathematiques', terme: 'groupe', discipline: 'mathematiques', confusion: 'faux-ami-courant', statut: 'pointe' as const, resume: 'b', suggestions: [] },
        ]}
        disciplines={[{ slug: 'comptabilite', nom: 'Comptabilité', couleur: '#3b82c4', description: 'd' }, { slug: 'mathematiques', nom: 'Mathématiques', couleur: '#e8703a', description: 'd' }]}
        statuts={[{ slug: 'propose', nom: 'Proposé', description: 'd' }, { slug: 'pointe', nom: 'Pointé', description: 'd' }]}
        chantiers={[{ slug: 'vocabulaire-du-bilan', nom: 'Le vocabulaire du bilan' }]}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Chantier' })).toBeInTheDocument()
    expect(screen.getByText('Le vocabulaire du bilan')).toBeInTheDocument()

    // Review Focus nº 5 : la case d’une fiche sans chantier reste vide. Un tiret
    // ou un « — » se lirait comme un nom de chantier dans une colonne de noms.
    const lignes = screen.getAllByRole('row')
    const ligneGroupe = lignes.find((l) => l.textContent?.includes('groupe'))
    expect(ligneGroupe?.querySelectorAll('td')[4]?.textContent).toBe('')
  })
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once components/catalogue-statique.test.tsx`
Expected: FAIL — la propriété `chantiers` n'existe pas, et il n'y a pas d'en-tête « Chantier ».

- [ ] **Step 3: Ajouter la colonne**

Dans `components/catalogue-statique.tsx`, ajouter la propriété :

```tsx
export function CatalogueStatique({
  index,
  disciplines,
  statuts,
  chantiers,
}: {
  index: FicheIndex[]
  disciplines: Discipline[]
  statuts: EntreeTaxonomie[]
  chantiers: { slug: string; nom: string }[]
}) {
  const libellesDisciplines = new Map(disciplines.map((d) => [d.slug, d.nom]))
  const libellesStatuts = new Map(statuts.map((s) => [s.slug, s.nom]))
  const libellesChantiers = new Map(chantiers.map((c) => [c.slug, c.nom]))
```

Ajouter l'en-tête après celui du statut :

```tsx
              <th scope="col" className="px-4 py-2 font-normal">
                Chantier
              </th>
```

et, dans chaque ligne, la cellule correspondante, juste avant celle de la suggestion :

```tsx
              <td className="px-4 py-2 text-stone-600">
                {fiche.chantier ? libellesChantiers.get(fiche.chantier) ?? fiche.chantier : ''}
              </td>
```

Dans `app/fiches/page.tsx`, passer la liste au contenu de secours :

```tsx
        fallback={
          <CatalogueStatique
            index={index}
            disciplines={disciplines}
            statuts={statuts}
            chantiers={chantiers}
          />
        }
```

- [ ] **Step 4: Ajouter les pages de chantier au plan de site**

Ajouter dans `app/sitemap.test.ts` :

```ts
  it('contient la page de chaque chantier, avec sa date de modification', () => {
    const entrees = sitemap()
    const entree = entrees.find((e) => e.url.endsWith('/chantiers/vocabulaire-du-bilan'))
    expect(entree).toBeDefined()
    expect(entree?.lastModified).toBeInstanceOf(Date)
  })
```

puis, dans `app/sitemap.ts`, ajouter l'import `import { getChantiers } from '@/lib/content/chantiers'` et, avant le `return` :

```ts
  const pagesChantiers: MetadataRoute.Sitemap = getChantiers().map((chantier) => ({
    url: `${base}/chantiers/${chantier.slug}`,
    lastModified: chantier.modifie,
  }))
```

et faire figurer `...pagesChantiers` dans le tableau rendu, après `...pagesFiches`.

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:once components/catalogue-statique.test.tsx app/sitemap.test.ts`
Expected: PASS.

- [ ] **Step 6: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run build && npm run verifier:statique`
Expected: tout vert.

- [ ] **Step 7: Commit**

```bash
git add components/catalogue-statique.tsx components/catalogue-statique.test.tsx app/fiches/page.tsx app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(chantiers): colonne du contenu de secours et plan de site"
```

---

## Task 7: Les trois avertissements de cohérence

**Files:**
- Modify: `scripts/coherence.ts`
- Test: `scripts/coherence.test.ts`
- Modify: `scripts/lint-content.ts`

**Interfaces:**
- Consumes: `Chantier` (Tâche 1), `Fiche` avec son champ `chantier` (Tâche 2), `Avertissement` existant.
- Produces :

```ts
export function verifierChantiers(chantiers: Chantier[], fiches: Fiche[]): Avertissement[]
```

Le `slug` de chaque `Avertissement` est celui du **chantier** concerné.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `scripts/coherence.test.ts` :

```ts
describe('verifierChantiers', () => {
  function chantier(p: Partial<Chantier> = {}): Chantier {
    return {
      slug: 'vocabulaire-du-bilan',
      nom: 'Le vocabulaire du bilan',
      discipline: 'comptabilite',
      resume: 'court',
      cree: new Date('2026-10-04'),
      modifie: new Date('2026-10-04'),
      corps: '## Risques\n\ntexte\n',
      ...p,
    }
  }

  function ficheDe(slug: string, chantierSlug?: string): Fiche {
    return fiche({ slug, chantier: chantierSlug })
  }

  it('ne signale rien pour un chantier sain', () => {
    expect(
      verifierChantiers(
        [chantier()],
        [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan'), ficheDe('passif-comptabilite', 'vocabulaire-du-bilan')],
      ),
    ).toEqual([])
  })

  it('signale un chantier qu’aucune fiche ne désigne', () => {
    const a = verifierChantiers([chantier()], [ficheDe('actif-comptabilite')])
    expect(a).toHaveLength(1)
    expect(a[0].slug).toBe('vocabulaire-du-bilan')
    expect(a[0].message).toMatch(/aucune fiche/i)
  })

  it('signale un chantier qui n’a qu’une seule fiche', () => {
    const a = verifierChantiers([chantier()], [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan')])
    expect(a.map((x) => x.message).join()).toMatch(/une seule fiche/i)
  })

  it('signale un chantier sans section « risques »', () => {
    const a = verifierChantiers(
      [chantier({ corps: '## Pourquoi\n\ntexte\n' })],
      [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan'), ficheDe('passif-comptabilite', 'vocabulaire-du-bilan')],
    )
    expect(a.map((x) => x.message).join()).toMatch(/risques/i)
  })
})
```

Compléter les imports du fichier de test avec `verifierChantiers` et le type `Chantier`, et étendre l'utilitaire `fiche()` existant pour qu'il accepte un `chantier` optionnel — il le reçoit déjà via `Partial<Fiche>`, donc aucune modification n'est nécessaire si le type a bien été étendu à la Tâche 2.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm run test:once scripts/coherence.test.ts`
Expected: FAIL — `verifierChantiers` n'est pas exportée.

- [ ] **Step 3: Écrire la vérification**

Ajouter dans `scripts/coherence.ts`, après `verifierCorpus` :

```ts
/**
 * Trois avertissements qui relèvent du jugement éditorial, et jamais de la
 * justesse : rien ici n’empêche le site de se construire. Ce qui rend le site
 * faux — un chantier inexistant, un chantier d’une autre discipline — est
 * refusé beaucoup plus tôt, au chargement du corpus.
 */
export function verifierChantiers(chantiers: Chantier[], fiches: Fiche[]): Avertissement[] {
  const avertissements: Avertissement[] = []

  for (const chantier of chantiers) {
    const siennes = fiches.filter((fiche) => fiche.chantier === chantier.slug)

    if (siennes.length === 0) {
      avertissements.push({
        slug: chantier.slug,
        message:
          'aucune fiche ne désigne ce chantier : un « chantier: » a probablement été oublié dans une fiche',
      })
    } else if (siennes.length === 1) {
      avertissements.push({
        slug: chantier.slug,
        message:
          'une seule fiche désigne ce chantier : le mot suppose un corpus, et une réforme d’un seul terme tient dans la fiche elle-même',
      })
    }

    // Même règle que pour les fiches, et par sous-chaîne pour la même raison :
    // « ## Risques et limites » traite bien le sujet.
    const titres = listerTitres(chantier.corps).map((titre) => titre.toLowerCase())
    if (!titres.some((titre) => titre.includes('risques'))) {
      avertissements.push({
        slug: chantier.slug,
        message:
          'aucune section de niveau 2 dont le titre contient « risques » : une réforme d’ensemble en a plus besoin qu’un mot isolé',
      })
    }
  }

  return avertissements
}
```

Compléter les imports du fichier avec le type `Chantier` depuis `../lib/content/schema`.

- [ ] **Step 4: Appeler la vérification depuis `scripts/lint-content.ts`**

Remplacer le début de `principal()` par :

```ts
function principal(): void {
  const taxonomies = chargerTaxonomies(DOSSIER_CONTENU)
  const chantiers = getChantiers(DOSSIER_CONTENU, taxonomies)
  const fiches = getFiches(DOSSIER_CONTENU, taxonomies, chantiers)
  const documents = (['manifeste', 'contribuer'] as const).map((nom) => ({
    nom,
    texte: getDocument(nom, DOSSIER_CONTENU),
  }))
  const avertissements = [
    ...verifierCorpus(fiches),
    ...verifierChantiers(chantiers, fiches),
    ...verifierDocuments(documents),
  ]

  console.log(
    `${fiches.length} fiche(s), ${chantiers.length} chantier(s), ${taxonomies.disciplines.length} discipline(s) — validation du schéma réussie.`,
  )
```

et compléter les deux imports en tête de fichier :

```ts
import { getChantiers } from '../lib/content/chantiers'
import { verifierChantiers, verifierCorpus, verifierDocuments } from './coherence'
```

Le reste de la fonction ne change pas. Passer `chantiers` à `getFiches` évite de
recharger les chantiers une seconde fois depuis le disque.

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm run test:once scripts/coherence.test.ts`
Expected: PASS — les quatre nouveaux tests réussissent.

- [ ] **Step 6: Vérifier sur le corpus réel**

Run: `npm run lint:content`
Expected: aucun avertissement. Le chantier réel a deux fiches et une section « Risques ».

- [ ] **Step 7: Vérifier par sabotage que les avertissements tombent**

Retirer temporairement le `chantier: vocabulaire-du-bilan` de `content/fiches/passif-comptabilite.md`, relancer `npm run lint:content`, et constater l'avertissement « une seule fiche ». Restaurer. **Donner la sortie dans le rapport.**

- [ ] **Step 8: Vérifier l'ensemble**

Run: `npm run test:once && npx tsc --noEmit && npm run lint && npm run lint:content && npm run build && npm run verifier:statique`
Expected: tout vert.

- [ ] **Step 9: Commit**

```bash
git add scripts/coherence.ts scripts/coherence.test.ts scripts/lint-content.ts
git commit -m "feat(chantiers): avertissements de cohérence sur les chantiers"
```

---

## Ce que ce plan ne fait pas

Rappelé ici pour qu'aucune tâche ne l'ajoute en passant :

- aucun nœud ni enveloppe sur la carte ;
- aucun vote sur un chantier, et aucune modification de `/api/votes`, de la table, ni de la note de vie privée ;
- aucune page d'index `/chantiers` ;
- aucun statut de chantier ;
- aucun jeu d'alternatives cohérent déclaré par un chantier ;
- aucune hiérarchie entre chantiers.

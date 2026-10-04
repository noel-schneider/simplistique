import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { getFiche, getFiches, getDocument, getIndex } from './fiches'
import type { Fiche, ChantierMeta } from './schema'

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
  it('lit toutes les fiches du dépôt, et chacune une seule fois', () => {
    const fiches = getFiches(DOSSIER_CONTENU, taxonomies)
    // Compte exact et non plancher : un plancher ne verrait jamais une fiche
    // lue deux fois. C’est le seul endroit du projet qui encode ce nombre
    // indépendamment du chargeur, donc le seul filet contre un sur-comptage —
    // `app/sitemap.test.ts` calcule désormais son attendu avec `getFiches()`
    // lui-même, et ne peut donc pas jouer ce rôle.
    expect(fiches).toHaveLength(5)
    expect(new Set(fiches.map((f) => f.slug)).size).toBe(fiches.length)
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

  it('refuse un slug de fichier avec accents, majuscules et espaces, en le citant', () => {
    const racine = corpusFactice({ 'Théorie Groupe .md': VALIDE })
    expect(() => getFiches(racine, taxonomies)).toThrow(/Théorie Groupe \.md/)
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
    ).toThrow(/chantier[\s\S]*invente/)
  })

  // Review Focus nº 2 : la seconde fiche doit échouer pour elle-même, et non
  // passer parce qu'une fiche précédente a validé le même chantier.
  it('refuse un chantier d’une autre discipline', () => {
    expect(() =>
      lireFicheDeTest({ discipline: 'mathematiques', chantier: 'vocabulaire-du-bilan' }, CHANTIERS),
    ).toThrow(/discipline/)
  })

  // Review Focus nº 3 : présent mais vide n'est pas la même chose qu'absent.
  it('refuse un chantier vide, et le dit pour ce qu’il est', () => {
    // L'assertion porte sur le message, et non sur le seul fait qu'une erreur
    // survienne : si le `.min(1)` disparaissait du schéma, la chaîne vide serait
    // quand même rejetée — par la branche « chantier inconnu », puisque aucun
    // chantier n'a `''` pour slug — et un simple `toThrow(/chantier/)` ne verrait
    // rien du changement.
    expect(() => lireFicheDeTest({ discipline: 'comptabilite', chantier: '' }, CHANTIERS)).toThrow(
      /chantier vide/,
    )
  })

  it('porte le chantier jusque dans l’index', () => {
    const index = getIndex(DOSSIER_CONTENU, undefined, CHANTIERS)
    expect(index.every((entree) => 'chantier' in entree)).toBe(true)
  })
})

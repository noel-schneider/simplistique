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
const PREUVES_VALIDES = `
- { slug: intuition, nom: Intuition, description: a }
- { slug: documentee, nom: Documentée, description: b }
- { slug: mesuree, nom: Mesurée, description: c }
`
const CONFUSIONS_VALIDES = `
- { slug: faux-ami-courant, nom: Faux ami, description: d }
`
const FAMILLES_VALIDES = `
- { slug: sciences, nom: Sciences, description: f }
`
const DISCIPLINES_VALIDES = `
- { slug: mathematiques, nom: Mathématiques, famille: sciences, couleur: '#e8703a', description: e }
`

describe('chargerTaxonomies', () => {
  it('charge les trois taxonomies réelles du dépôt', () => {
    const t = chargerTaxonomies(DOSSIER_CONTENU)
    expect(t.statuts.map((s) => s.slug)).toEqual(['pointe', 'propose', 'rejete'])
    expect(t.preuves.map((p) => p.slug)).toEqual(['intuition', 'documentee', 'mesuree'])
    expect(t.disciplines.map((d) => d.slug)).toContain('theorie-musicale')
    // confusions.yml est volontairement extensible (spec §3.4, README) :
    // une borne inférieure plutôt qu'une égalité, pour qu'un sixième type
    // ajouté au corpus ne casse pas l'intégration continue.
    expect(t.confusions.length).toBeGreaterThanOrEqual(5)
    expect(t.confusions.map((c) => c.slug)).toContain('paire-bancale')
  })

  it('donne une couleur à chaque discipline réelle', () => {
    for (const d of chargerTaxonomies(DOSSIER_CONTENU).disciplines) {
      expect(d.couleur).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('refuse un slug dupliqué en nommant le fautif', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `
- { slug: escalade, nom: Escalade, famille: sciences, couleur: '#3fa08a', description: a }
- { slug: escalade, nom: Grimpe, famille: sciences, couleur: '#3fa08a', description: b }
`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/escalade/)
  })

  it('refuse une entrée sans description', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, couleur: '#3fa08a' }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/disciplines\.yml/)
  })

  it('refuse une couleur qui n\'est pas hexadécimale', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, famille: sciences, couleur: turquoise, description: a }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/couleur/)
  })

  it('cite le slug fautif dans le message, même quand un autre champ est invalide', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, famille: sciences, couleur: turquoise, description: a }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/entrée 1 \(« escalade »\)/)
  })

  it('refuse une taxonomie de statuts qui ne contient pas les trois attendus', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': `- { slug: pointe, nom: Pointé, description: a }`,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': DISCIPLINES_VALIDES,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/statuts/)
  })

  it('refuse une taxonomie de preuves qui ne contient pas exactement intuition, documentee, mesuree', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': `- { slug: intuition, nom: Intuition, description: a }`,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': DISCIPLINES_VALIDES,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/preuves\.yml doit contenir exactement/)
  })

  it('charge les familles réelles et rattache chaque discipline à l’une d’elles', () => {
    const t = chargerTaxonomies(DOSSIER_CONTENU)
    const slugs = new Set(t.familles.map((f) => f.slug))
    expect(slugs.size).toBeGreaterThan(0)
    for (const d of t.disciplines) expect(slugs).toContain(d.famille)
  })

  it('refuse une discipline sans famille', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, couleur: '#3fa08a', description: a }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/famille/)
  })

  it('refuse une famille inconnue en nommant la discipline et la famille', () => {
    const racine = dossierFactice({
      'familles.yml': FAMILLES_VALIDES,
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': `- { slug: escalade, nom: Escalade, famille: fantome, couleur: '#3fa08a', description: a }`,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/escalade.*fantome/)
  })

  it('refuse un familles.yml vide', () => {
    const racine = dossierFactice({
      'familles.yml': '[]',
      'statuts.yml': STATUTS_VALIDES,
      'preuves.yml': PREUVES_VALIDES,
      'confusions.yml': CONFUSIONS_VALIDES,
      'disciplines.yml': DISCIPLINES_VALIDES,
    })
    expect(() => chargerTaxonomies(racine)).toThrow(/familles\.yml/)
  })
})

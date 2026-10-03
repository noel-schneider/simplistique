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

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
    expect(a[0]).toEqual({ slug: 'groupe-mathematiques', message: expect.stringMatching(/risques/) })
  })

  it('accepte un titre de section plus long que « Risques »', () => {
    expect(verifierCoherence(fiche({ corps: '## Risques et limites\n\ntexte\n' }))).toEqual([])
    expect(verifierCoherence(fiche({ corps: '## Les risques du changement\n\ntexte\n' }))).toEqual([])
  })

  it('accepte le titre quelle que soit la casse', () => {
    expect(verifierCoherence(fiche({ corps: '## RISQUES\n\ntexte\n' }))).toEqual([])
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

  it('signale des crochets doubles qui survivent à l\'aplatissement, en situant le passage', () => {
    const a = verifierCoherence(fiche({ corps: '## Risques\n\nun [[crochet non ferme\n' }))
    expect(a).toHaveLength(1)
    expect(a[0].message).toMatch(/crochets doubles/)
    expect(a[0].message).toContain('[[crochet non ferme')
  })

  it('ne signale rien pour des crochets bien formés', () => {
    expect(verifierCoherence(fiche({ corps: '## Risques\n\nla [[clarté]] et [[Intuitivité|intuitif]]\n' }))).toEqual([])
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

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

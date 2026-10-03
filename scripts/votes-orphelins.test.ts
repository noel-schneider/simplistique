import { describe, expect, it } from 'vitest'
import { orphelines, type LigneDeVote } from './votes-orphelins'

describe('orphelines', () => {
  it('rend vide pour un corpus de lignes vide', () => {
    expect(orphelines([], new Map())).toEqual([])
  })

  it('marque orpheline une ligne dont la fiche a disparu du corpus', () => {
    const lignes: LigneDeVote[] = [{ fiche: 'fiche-disparue', alternative: null, n: 3 }]
    expect(orphelines(lignes, new Map())).toEqual(lignes)
  })

  it('marque orpheline une ligne dont l’alternative n’est plus une suggestion de la fiche', () => {
    const connues = new Map([['actif-comptabilite', new Set(['abc123'])]])
    const lignes: LigneDeVote[] = [
      { fiche: 'actif-comptabilite', alternative: 'une-empreinte-disparue', n: 2 },
    ]
    expect(orphelines(lignes, connues)).toEqual(lignes)
  })

  it('ne marque rien quand la fiche et l’alternative existent toutes les deux', () => {
    const connues = new Map([['actif-comptabilite', new Set(['abc123'])]])
    const lignes: LigneDeVote[] = [
      { fiche: 'actif-comptabilite', alternative: null, n: 5 },
      { fiche: 'actif-comptabilite', alternative: 'abc123', n: 1 },
    ]
    expect(orphelines(lignes, connues)).toEqual([])
  })
})

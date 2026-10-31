import { describe, expect, it } from 'vitest'
import type { FicheIndex } from './content/schema'
import { getFiches } from './content/fiches'
import { LONGUEUR_MAX_ACCROCHE } from './content/schema'
import { fichesALaUne } from './accueil'

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'propose',
    preuve: 'documentee',
    resume: '',
    suggestions: [],
    accroche: 'Une phrase.',
    ...p,
  }
}

describe('fichesALaUne', () => {
  it('ne retient que les fiches avec accroche', () => {
    const r = fichesALaUne([fiche({ slug: 'a', accroche: undefined }), fiche({ slug: 'b' })])
    expect(r.map((f) => f.slug)).toEqual(['b'])
  })

  it('met mesuree avant documentee avant intuition', () => {
    const r = fichesALaUne([
      fiche({ slug: 'i', preuve: 'intuition' }),
      fiche({ slug: 'd', preuve: 'documentee' }),
      fiche({ slug: 'm', preuve: 'mesuree' }),
    ])
    expect(r.map((f) => f.slug)).toEqual(['m', 'd', 'i'])
  })

  it('départage par terme en ordre français', () => {
    const r = fichesALaUne([
      fiche({ slug: 'z', terme: 'zèbre' }),
      fiche({ slug: 'e', terme: 'été' }),
      fiche({ slug: 'f', terme: 'fourmi' }),
    ])
    expect(r.map((f) => f.slug)).toEqual(['e', 'f', 'z'])
  })

  it('rend au plus 3', () => {
    const index = ['a', 'b', 'c', 'd', 'e'].map((s) => fiche({ slug: s, terme: s }))
    expect(fichesALaUne(index)).toHaveLength(3)
    expect(fichesALaUne(index, 2)).toHaveLength(2)
  })

  it('rend [] sans accroche', () => {
    expect(fichesALaUne([fiche({ accroche: undefined })])).toEqual([])
  })

  it('ne modifie pas l’index reçu', () => {
    const index = [fiche({ slug: 'b', terme: 'b' }), fiche({ slug: 'a', terme: 'a' })]
    fichesALaUne(index)
    expect(index.map((f) => f.slug)).toEqual(['b', 'a'])
  })
})

describe('accroches du corpus', () => {
  const avecAccroche = getFiches().filter((f) => f.accroche !== undefined)

  it('au moins trois fiches portent une accroche', () => {
    expect(avecAccroche.length).toBeGreaterThanOrEqual(3)
  })

  it.each(avecAccroche.map((f) => [f.slug, f] as const))(
    '%s : accroche courte, et chaque chiffre figure dans le corps',
    (_slug, f) => {
      const accroche = f.accroche as string
      expect(accroche.length).toBeLessThanOrEqual(LONGUEUR_MAX_ACCROCHE)
      for (const nombre of accroche.match(/\d+(?:,\d+)?/g) ?? []) {
        expect(f.corps).toContain(nombre)
      }
    },
  )
})

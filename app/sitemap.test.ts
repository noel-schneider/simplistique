import { describe, expect, it } from 'vitest'
import { getFiches } from '@/lib/content/fiches'
import sitemap from './sitemap'

const PAGES_SANS_DATE = ['/manifeste', '/contribuer']
const PAGES_DATEES_DU_CORPUS = ['/', '/fiches']

describe('sitemap', () => {
  it('liste les quatre pages statiques et les cinq fiches', () => {
    const entrees = sitemap()
    const fiches = getFiches()

    expect(entrees).toHaveLength(9)

    const urls = entrees.map((e) => e.url)
    for (const fiche of fiches) {
      expect(urls.some((u) => u.endsWith(`/fiches/${fiche.slug}`))).toBe(true)
    }
    for (const chemin of [...PAGES_DATEES_DU_CORPUS, ...PAGES_SANS_DATE]) {
      expect(urls.some((u) => u.endsWith(chemin))).toBe(true)
    }
  })

  it('utilise la date modifie de chaque fiche comme date de dernière modification', () => {
    const entrees = sitemap()
    const fiches = getFiches()

    for (const fiche of fiches) {
      const entree = entrees.find((e) => e.url.endsWith(`/fiches/${fiche.slug}`))
      expect(entree?.lastModified).toBeInstanceOf(Date)
      expect(entree?.lastModified).toEqual(fiche.modifie)
    }
  })

  it('date / et /fiches avec la modification la plus récente du corpus, car elles affichent le corpus', () => {
    const entrees = sitemap()
    const fiches = getFiches()
    const plusRecente = fiches
      .map((f) => f.modifie)
      .reduce((a, b) => (b > a ? b : a))

    for (const chemin of PAGES_DATEES_DU_CORPUS) {
      const entree = entrees.find((e) => e.url.endsWith(chemin))
      expect(entree?.lastModified).toBeInstanceOf(Date)
      expect(entree?.lastModified).toEqual(plusRecente)
    }
  })

  it("n'émet aucune date pour /manifeste et /contribuer : aucune date honnête n'existe pour ces documents", () => {
    const entrees = sitemap()

    for (const chemin of PAGES_SANS_DATE) {
      const entree = entrees.find((e) => e.url.endsWith(chemin))
      expect(entree?.lastModified).toBeUndefined()
    }
  })
})

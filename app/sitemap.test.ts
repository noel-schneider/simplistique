import { describe, expect, it } from 'vitest'
import { getFiches } from '@/lib/content/fiches'
import sitemap from './sitemap'

describe('sitemap', () => {
  it('liste les quatre pages statiques et les cinq fiches, chacune datée', () => {
    const entrees = sitemap()
    const fiches = getFiches()

    expect(entrees).toHaveLength(9)

    for (const entree of entrees) {
      expect(entree.lastModified).toBeDefined()
    }

    const urls = entrees.map((e) => e.url)
    for (const fiche of fiches) {
      expect(urls.some((u) => u.endsWith(`/fiches/${fiche.slug}`))).toBe(true)
    }

    for (const chemin of ['/', '/manifeste', '/fiches', '/contribuer']) {
      expect(urls.some((u) => u.endsWith(chemin))).toBe(true)
    }
  })

  it('utilise la date modifie de chaque fiche comme date de dernière modification', () => {
    const entrees = sitemap()
    const fiches = getFiches()

    for (const fiche of fiches) {
      const entree = entrees.find((e) => e.url.endsWith(`/fiches/${fiche.slug}`))
      expect(entree?.lastModified).toEqual(fiche.modifie)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { getChantiers } from '@/lib/content/chantiers'
import { getFiches } from '@/lib/content/fiches'
import sitemap from './sitemap'

const PAGES_SANS_DATE = ['/manifeste', '/contribuer']
const PAGES_DATEES_DU_CORPUS = ['/', '/fiches']

// Le plan de site ne publie que le contenu réel : les pages de démonstration
// restent visibles sur le site mais n’ont pas à être indexées. Les tests qui
// suivent raisonnent donc sur le corpus publié, pas sur le corpus entier.
const fichesPubliees = () => getFiches().filter((fiche) => !fiche.demonstration)
const chantiersPublies = () => getChantiers().filter((c) => !c.demonstration)

describe('sitemap', () => {
  it('liste les quatre pages statiques et les fiches publiées', () => {
    const entrees = sitemap()
    const fiches = fichesPubliees()

    // Compte exact, pas « au moins » : un corpus listé deux fois ou un groupe de
    // pages oublié doit se voir. Exprimé comme une somme plutôt qu’en dur, pour
    // qu’ajouter une fiche ou un chantier ne fasse pas tomber ce test pour rien.
    // Les quatre : la page d’accueil, le catalogue, le manifeste, contribuer.
    expect(entrees).toHaveLength(4 + fichesPubliees().length + chantiersPublies().length)

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
    const fiches = fichesPubliees()

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

  it('n’indexe aucune page de démonstration', () => {
    const urls = sitemap().map((e) => e.url)
    const fictives = [
      ...getFiches().filter((f) => f.demonstration).map((f) => `/fiches/${f.slug}`),
      ...getChantiers().filter((c) => c.demonstration).map((c) => `/chantiers/${c.slug}`),
    ]

    // Le corpus doit en contenir, sans quoi ce test ne prouverait rien : il
    // passerait tout seul le jour où le contenu fictif aura disparu.
    expect(fictives.length).toBeGreaterThan(0)
    for (const chemin of fictives) {
      expect(urls.some((u) => u.endsWith(chemin))).toBe(false)
    }
  })

  it('contient la page de chaque chantier, avec sa date de modification', () => {
    const entrees = sitemap()
    const chantiers = chantiersPublies()

    for (const chantier of chantiers) {
      const entree = entrees.find((e) => e.url.endsWith(`/chantiers/${chantier.slug}`))
      expect(entree).toBeDefined()
      // L’égalité, et non le seul type : c’est elle qui distingue `chantier.modifie`
      // d’une date de build ou de la date agrégée du corpus.
      expect(entree?.lastModified).toEqual(chantier.modifie)
    }
  })
})

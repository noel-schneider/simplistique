import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { styleStatut, VueCarte } from './vue-carte'

const familles = [
  { slug: 'sciences', nom: 'Sciences', description: 'a' },
  { slug: 'societe', nom: 'Société', description: 'b' },
  { slug: 'pratiques', nom: 'Arts et pratiques', description: 'c' },
]

const disciplines = [
  { slug: 'mathematiques', nom: 'Mathématiques', famille: 'sciences', couleur: '#e8703a', description: 'a' },
  { slug: 'escalade', nom: 'Escalade', famille: 'pratiques', couleur: '#3fa08a', description: 'b' },
  { slug: 'comptabilite', nom: 'Comptabilité', famille: 'societe', couleur: '#3b82c4', description: 'c' },
]

const libellesStatuts = new Map([
  ['pointe', 'Pointé'],
  ['propose', 'Proposé'],
  ['rejete', 'Rejeté'],
])

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    preuve: 'documentee',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const fiches: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', statut: 'pointe' }),
  fiche({ slug: 'corps-mathematiques', terme: 'corps', statut: 'rejete' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose' }),
]

describe('styleStatut', () => {
  it('remplit le cercle pour une suggestion proposée', () => {
    expect(styleStatut('propose', '#e8703a')).toMatchObject({ fill: '#e8703a', fillOpacity: 1 })
  })

  it('laisse le cercle en contour pour un terme seulement pointé', () => {
    expect(styleStatut('pointe', '#e8703a')).toMatchObject({ fill: 'none', stroke: '#e8703a' })
  })

  it('estompe le cercle pour un changement rejeté', () => {
    const style = styleStatut('rejete', '#e8703a')
    expect(style.fillOpacity).toBeLessThan(1)
    expect(style.fillOpacity).toBeGreaterThan(0)
  })
})

describe('VueCarte', () => {
  it('fait de chaque fiche un lien réel, atteignable au clavier', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: /groupe/ })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('nomme chaque zone de discipline avec son compte de fiches', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Mathématiques/)).toBeInTheDocument()
    expect(screen.getByText(/Mathématiques/).textContent).toMatch(/2/)
    expect(screen.getByText(/Escalade/).textContent).toMatch(/1/)
  })

  it('masque une discipline sans fiche', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.queryByText(/Comptabilité/)).not.toBeInTheDocument()
  })

  it('ne plante pas sur un corpus entièrement vide', () => {
    render(<VueCarte fiches={[]} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText(/Mathématiques/)).not.toBeInTheDocument()
  })

  it('colore chaque point selon sa discipline', () => {
    const { container } = render(
      <VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const cercles = Array.from(container.querySelectorAll('circle'))
    const mathematiques = cercles.filter((c) => c.getAttribute('stroke') === '#e8703a')
    const escalade = cercles.filter((c) => c.getAttribute('stroke') === '#3fa08a')
    expect(mathematiques).toHaveLength(2)
    expect(escalade).toHaveLength(1)
  })

  it('donne le même rayon à tous les points', () => {
    const { container } = render(
      <VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const rayons = new Set(
      Array.from(container.querySelectorAll('circle')).map((c) => c.getAttribute('r')),
    )
    expect(rayons.size).toBe(1)
  })

  it('affiche une légende des trois statuts', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    for (const nom of ['Pointé', 'Proposé', 'Rejeté']) {
      expect(screen.getByText(nom)).toBeInTheDocument()
    }
  })

  it('décrit chaque point par son terme et son statut', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: 'groupe — Pointé' })).toBeInTheDocument()
  })

  it('marque chaque point d’une classe qui porte le style de focus', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    for (const lien of screen.getAllByRole('link')) {
      expect(lien).toHaveClass('point-fiche')
    }
  })

  it('dit en clair ce que la couleur et le remplissage encodent', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Chaque couleur désigne une discipline/)).toBeInTheDocument()
  })

  it('regroupe les zones sous le titre de leur famille, dans l’ordre de familles.yml', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    const titresFamilles = screen.getAllByRole('heading', { level: 2 })
    expect(titresFamilles.map((t) => t.textContent)).toEqual(['Sciences', 'Arts et pratiques'])
    const sciences = titresFamilles[0].closest('section')!
    expect(within(sciences).getByText(/Mathématiques/)).toBeInTheDocument()
    expect(within(sciences).queryByText(/Escalade/)).not.toBeInTheDocument()
  })

  it('n’affiche pas une famille sans discipline', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.queryByRole('heading', { name: 'Société' })).not.toBeInTheDocument()
  })

  it('place les titres de zone au niveau 3, sous le titre de famille', () => {
    render(<VueCarte fiches={fiches} familles={familles} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })
})

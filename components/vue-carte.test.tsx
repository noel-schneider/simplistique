import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { styleStatut, VueCarte } from './vue-carte'

const disciplines = [
  { slug: 'mathematiques', nom: 'Mathématiques', couleur: '#e8703a', description: 'a' },
  { slug: 'escalade', nom: 'Escalade', couleur: '#3fa08a', description: 'b' },
  { slug: 'comptabilite', nom: 'Comptabilité', couleur: '#3b82c4', description: 'c' },
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
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: /groupe/ })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('nomme chaque zone de discipline avec son compte de fiches', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Mathématiques/)).toBeInTheDocument()
    expect(screen.getByText(/Mathématiques/).textContent).toMatch(/2/)
    expect(screen.getByText(/Escalade/).textContent).toMatch(/1/)
  })

  it('dessine une discipline sans aucune fiche avec un compte de zéro', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Comptabilité/).textContent).toMatch(/0/)
  })

  it('ne plante pas sur un corpus entièrement vide', () => {
    render(<VueCarte fiches={[]} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText(/Mathématiques/).textContent).toMatch(/0/)
  })

  it('colore chaque point selon sa discipline', () => {
    const { container } = render(
      <VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const cercles = Array.from(container.querySelectorAll('circle'))
    const mathematiques = cercles.filter((c) => c.getAttribute('stroke') === '#e8703a')
    const escalade = cercles.filter((c) => c.getAttribute('stroke') === '#3fa08a')
    expect(mathematiques).toHaveLength(2)
    expect(escalade).toHaveLength(1)
  })

  it('donne le même rayon à tous les points', () => {
    const { container } = render(
      <VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />,
    )
    const rayons = new Set(
      Array.from(container.querySelectorAll('circle')).map((c) => c.getAttribute('r')),
    )
    expect(rayons.size).toBe(1)
  })

  it('affiche une légende des trois statuts', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    for (const nom of ['Pointé', 'Proposé', 'Rejeté']) {
      expect(screen.getByText(nom)).toBeInTheDocument()
    }
  })

  it('décrit chaque point par son terme et son statut', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByRole('link', { name: 'groupe — Pointé' })).toBeInTheDocument()
  })

  it('marque chaque point d’une classe qui porte le style de focus', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    for (const lien of screen.getAllByRole('link')) {
      expect(lien).toHaveClass('point-fiche')
    }
  })

  it('dit en clair ce que la couleur et le remplissage encodent', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    expect(screen.getByText(/Chaque couleur désigne une discipline/)).toBeInTheDocument()
  })

  it('utilise des titres de niveau 2 pour chaque zone de discipline', () => {
    render(<VueCarte fiches={fiches} disciplines={disciplines} libellesStatuts={libellesStatuts} />)
    const titresNiveau2 = screen.getAllByRole('heading', { level: 2 })
    // Une zone par discipline, même celles sans fiche (Mathématiques, Escalade, Comptabilité)
    expect(titresNiveau2).toHaveLength(3)
  })
})

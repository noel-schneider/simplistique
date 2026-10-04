import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Discipline, EntreeTaxonomie, FicheIndex } from '../lib/content/schema'
import { CatalogueStatique } from './catalogue-statique'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

const disciplines: Discipline[] = [
  {
    slug: 'mathematiques',
    nom: 'Mathématiques',
    description: 'La discipline des mathématiques.',
    couleur: '#1d4ed8',
  },
]
const statuts: EntreeTaxonomie[] = [
  { slug: 'pointe', nom: 'Pointé', description: 'Le problème est signalé.' },
]
const chantiers = [{ slug: 'structures-algebriques', nom: 'Les structures algébriques' }]

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

function rendre(fiches: FicheIndex[]) {
  render(
    <CatalogueStatique
      index={fiches}
      disciplines={disciplines}
      statuts={statuts}
      chantiers={chantiers}
    />,
  )
}

function cellulesDe(ligne: number): string[] {
  return Array.from(screen.getAllByRole('row')[ligne].querySelectorAll('td')).map(
    (cellule) => cellule.textContent!,
  )
}

describe('CatalogueStatique', () => {
  it('marque les seules fiches de démonstration', () => {
    rendre([
      fiche({ slug: 'anneau-mathematiques', terme: 'anneau', demonstration: true }),
      fiche({ slug: 'groupe-mathematiques', terme: 'groupe' }),
    ])

    // Par cellule et non par page : une pastille rendue au bon compte mais sur
    // la mauvaise ligne désignerait une analyse réelle comme fictive.
    expect(cellulesDe(1)[0]).toBe('anneaudémo')
    expect(cellulesDe(2)[0]).toBe('groupe')
  })

  it('affiche le nom du chantier, et non son slug', () => {
    rendre([fiche({ slug: 'anneau-mathematiques', terme: 'anneau', chantier: 'structures-algebriques' })])

    // Le contenu de secours est le rendu final chez un visiteur sans
    // JavaScript : un slug affiché ici serait vu tel quel.
    expect(cellulesDe(1)[3]).toBe('Les structures algébriques')
  })

  it('laisse la colonne Chantier vide quand la fiche n’en désigne aucun', () => {
    rendre([fiche({ slug: 'groupe-mathematiques', terme: 'groupe' })])
    expect(cellulesDe(1)[3]).toBe('')
  })
})

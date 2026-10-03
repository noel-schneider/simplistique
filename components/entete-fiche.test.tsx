import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FicheMeta } from '../lib/content/schema'
import { EnteteFiche } from './entete-fiche'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

function meta(p: Partial<FicheMeta> = {}): FicheMeta {
  return {
    slug: 'groupe-mathematiques',
    terme: 'groupe',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: 'Un mot courant au sens technique étranger.',
    suggestions: [],
    cree: new Date('2026-10-03'),
    modifie: new Date('2026-10-03'),
    ...p,
  }
}

const libelles = {
  nomDiscipline: 'Mathématiques',
  nomConfusion: 'Faux ami courant',
  nomStatut: 'Pointé',
}

describe('EnteteFiche', () => {
  it('met le terme en titre de niveau 1', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByRole('heading', { level: 1, name: 'groupe' })).toBeInTheDocument()
  })

  it('affiche discipline, type de confusion et statut en clair', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByText('Mathématiques')).toBeInTheDocument()
    expect(screen.getByText('Faux ami courant')).toBeInTheDocument()
    expect(screen.getByText('Pointé')).toBeInTheDocument()
  })

  it('dit explicitement qu’aucune alternative n’est proposée quand la liste est vide', () => {
    render(<EnteteFiche fiche={meta({ statut: 'pointe', suggestions: [] })} {...libelles} />)
    expect(screen.getByText(/aucune alternative/i)).toBeInTheDocument()
  })

  it('met « Suggestion » au singulier quand il n’y en a qu’une', () => {
    render(
      <EnteteFiche
        fiche={meta({ statut: 'propose', suggestions: ['avoir'] })}
        {...libelles}
        nomStatut="Proposé"
      />,
    )
    expect(screen.getByText(/^Suggestion :$/)).toBeInTheDocument()
    expect(screen.getByText('avoir')).toBeInTheDocument()
  })

  it('liste les suggestions quand il y en a plusieurs', () => {
    render(
      <EnteteFiche
        fiche={meta({ statut: 'propose', suggestions: ['avoir', 'ressource'] })}
        {...libelles}
        nomStatut="Proposé"
      />,
    )
    expect(screen.getByText('avoir')).toBeInTheDocument()
    expect(screen.getByText('ressource')).toBeInTheDocument()
    expect(screen.queryByText(/aucune alternative/i)).not.toBeInTheDocument()
  })

  it('relie la discipline au catalogue filtré sur elle', () => {
    render(<EnteteFiche fiche={meta()} {...libelles} />)
    expect(screen.getByRole('link', { name: 'Mathématiques' })).toHaveAttribute(
      'href',
      '/fiches?discipline=mathematiques',
    )
  })

  it('affiche la date de modification dans un élément de temps lisible par une machine', () => {
    render(<EnteteFiche fiche={meta({ modifie: new Date('2026-11-20') })} {...libelles} />)
    expect(screen.getByText(/20 novembre 2026/)).toHaveAttribute('datetime', '2026-11-20')
  })
})

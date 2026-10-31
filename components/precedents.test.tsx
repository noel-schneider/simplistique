import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Precedent } from '../lib/content/schema'
import { Precedents } from './precedents'

const precedents: Precedent[] = [
  { lieu: 'Japon', annee: 2017, description: 'remplacement par « apparent » et « latent »' },
  { lieu: 'France', annee: 2022, description: 'nouvelle mention autorisée' },
]

describe('Precedents', () => {
  it('affiche le titre « Déjà fait ailleurs »', () => {
    render(<Precedents precedents={precedents} />)
    expect(screen.getByRole('heading', { name: 'Déjà fait ailleurs' })).toBeInTheDocument()
  })

  it('rend une ligne « lieu, année — description » par entrée', () => {
    render(<Precedents precedents={precedents} />)
    const lignes = screen.getAllByRole('listitem')
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toHaveTextContent('Japon, 2017 — remplacement par « apparent » et « latent »')
    expect(lignes[1]).toHaveTextContent('France, 2022 — nouvelle mention autorisée')
  })

  it('ne rend rien pour un tableau vide', () => {
    const { container } = render(<Precedents precedents={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

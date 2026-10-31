import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Source } from '../lib/content/schema'
import { Sources } from './sources'

const base: Source = {
  auteur: 'Okun',
  annee: 1989,
  titre: 'The Concept of Mass',
  lecture: 'originale',
}

describe('Sources', () => {
  it('affiche auteur, année et titre', () => {
    render(<Sources sources={[base]} />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText(/Okun/)).toBeInTheDocument()
    expect(screen.getByText(/1989/)).toBeInTheDocument()
    expect(screen.getByText(/The Concept of Mass/)).toBeInTheDocument()
  })

  it('met le titre en lien quand url existe, sinon non', () => {
    const { rerender } = render(<Sources sources={[{ ...base, url: 'https://exemple.org/okun' }]} />)
    expect(screen.getByRole('link', { name: /The Concept of Mass/ })).toHaveAttribute(
      'href',
      'https://exemple.org/okun',
    )
    rerender(<Sources sources={[base]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('signale une lecture de seconde main, pas une lecture originale', () => {
    const { rerender } = render(<Sources sources={[{ ...base, lecture: 'seconde-main' }]} />)
    expect(screen.getByText(/lue de seconde main/)).toBeInTheDocument()
    rerender(<Sources sources={[base]} />)
    expect(screen.queryByText(/lue de seconde main/)).toBeNull()
  })

  it('ne rend rien pour un tableau vide', () => {
    const { container } = render(<Sources sources={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

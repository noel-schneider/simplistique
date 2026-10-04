import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BandeauDemonstration } from './bandeau-demonstration'

describe('BandeauDemonstration', () => {
  it('dit que le contenu est fictif, en toutes lettres', () => {
    render(<BandeauDemonstration />)
    // L’assertion porte sur les mots : c’est le seul contenu de ce composant, et
    // un bandeau qui n’énoncerait pas la fiction ne servirait à rien.
    expect(screen.getByText(/Contenu de démonstration/)).toBeInTheDocument()
    expect(screen.getByText(/fictive/)).toBeInTheDocument()
  })

  it('est une région complémentaire, pas une alerte', () => {
    // `role="alert"` interromprait la lecture d’un lecteur d’écran pour une
    // information de contexte, pas d’urgence.
    const { container } = render(<BandeauDemonstration />)
    expect(container.querySelector('aside')).not.toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

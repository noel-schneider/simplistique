import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { rendreMarkdown } from '../lib/content/markdown'
import { Prose } from './prose'

describe('Prose', () => {
  it('affiche le HTML rendu depuis du markdown', async () => {
    render(<Prose html={await rendreMarkdown('## Un titre\n\nUn paragraphe.')} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Un titre' })).toBeInTheDocument()
    expect(screen.getByText('Un paragraphe.')).toBeInTheDocument()
  })

  it('n\'affiche aucun crochet double issu de la source', async () => {
    const { container } = render(<Prose html={await rendreMarkdown('un frein à la [[clarté]]')} />)
    expect(container.textContent).toContain('un frein à la clarté')
    expect(container.textContent).not.toContain('[[')
  })

  it('n\'exécute pas le HTML brut présent dans la source', async () => {
    const { container } = render(<Prose html={await rendreMarkdown('<script>alert(1)</script>')} />)
    expect(container.querySelector('script')).toBeNull()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Navigation } from './navigation'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

describe('Navigation', () => {
  it('mène aux quatre destinations du site', () => {
    render(<Navigation />)
    expect(screen.getByRole('link', { name: /simplistique/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /manifeste/i })).toHaveAttribute('href', '/manifeste')
    expect(screen.getByRole('link', { name: /fiches/i })).toHaveAttribute('href', '/fiches')
    expect(screen.getByRole('link', { name: /contribuer/i })).toHaveAttribute('href', '/contribuer')
  })

  it('est une balise de navigation repérable', () => {
    render(<Navigation />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})

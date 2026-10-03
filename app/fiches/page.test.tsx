import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { getIndex } from '@/lib/content/fiches'
import PageFiches from './page'

// Les mêmes mocks que components/corpus.test.tsx : la page rend <Corpus>, qui
// en dépend.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/fiches',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

describe('PageFiches — repli <noscript>', () => {
  it('contient un lien par fiche du corpus', () => {
    // React ne rend pas le contenu de <noscript> côté client (voir
    // components/corpus.test.tsx pour le rendu habituel) : ce repli n'existe
    // que dans le HTML statique généré au build, d'où `renderToStaticMarkup`
    // plutôt que `render`.
    const html = renderToStaticMarkup(<PageFiches />)
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)
    expect(noscript).not.toBeNull()

    const liens = noscript![1].match(/<a /g) ?? []
    expect(liens).toHaveLength(getIndex().length)

    for (const fiche of getIndex()) {
      expect(noscript![1]).toContain(`href="/fiches/${fiche.slug}"`)
    }
  })
})

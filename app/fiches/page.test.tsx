import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CatalogueStatique } from '@/components/catalogue-statique'
import { getIndex } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'
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

describe('CatalogueStatique — repli <Suspense>', () => {
  // C'est ce composant, et non <noscript>, qui porte désormais le corpus
  // dans le HTML statique livré au build (voir app/fiches/page.tsx) : un
  // <Suspense> rend son contenu de secours au build, sans être concerné par
  // la sortie vers le rendu client que provoque `useSearchParams()` dans
  // <Corpus>.
  it('rend un lien par fiche du corpus, et un seul tableau', () => {
    const { disciplines, statuts } = chargerTaxonomies()
    const index = getIndex()

    const html = renderToStaticMarkup(
      <CatalogueStatique index={index} disciplines={disciplines} statuts={statuts} />,
    )

    const tables = html.match(/<table/g) ?? []
    expect(tables).toHaveLength(1)

    // Compte exact, pas « au moins » : un compte minimal ne détecterait pas
    // un corpus listé deux fois.
    const liens = html.match(/<a /g) ?? []
    expect(liens).toHaveLength(index.length)

    for (const fiche of index) {
      expect(html).toContain(`href="/fiches/${fiche.slug}"`)
    }
  })
})

describe('PageFiches', () => {
  it('ne rend plus de <noscript>, et un seul listing du corpus', () => {
    const html = renderToStaticMarkup(<PageFiches />)

    expect(html).not.toContain('<noscript>')

    const tables = html.match(/<table/g) ?? []
    expect(tables).toHaveLength(1)

    const liens = html.match(/<a href="\/fiches\//g) ?? []
    expect(liens).toHaveLength(getIndex().length)
  })
})

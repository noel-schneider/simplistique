import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CatalogueStatique } from '@/components/catalogue-statique'
import { getChantiers } from '@/lib/content/chantiers'
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
    const chantiers = getChantiers().map((c) => ({ slug: c.slug, nom: c.nom }))

    const html = renderToStaticMarkup(
      <CatalogueStatique
        index={index}
        disciplines={disciplines}
        statuts={statuts}
        chantiers={chantiers}
      />,
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

  it('montre le chantier d’une fiche, et laisse la case vide sinon', () => {
    const { disciplines, statuts } = chargerTaxonomies()
    const chantiers = getChantiers().map((c) => ({ slug: c.slug, nom: c.nom }))
    const index = getIndex()

    render(
      <CatalogueStatique
        index={index}
        disciplines={disciplines}
        statuts={statuts}
        chantiers={chantiers}
      />,
    )

    // L’index de la colonne se déduit de l’en-tête plutôt que d’être écrit en
    // dur : un index figé se périmerait au prochain remaniement du tableau, et
    // le test se mettrait à mesurer une autre colonne sans rien dire.
    const entetes = screen.getAllByRole('columnheader').map((entete) => entete.textContent)
    const colonne = entetes.indexOf('Chantier')
    expect(colonne).toBeGreaterThanOrEqual(0)

    const lignes = screen.getAllByRole('row')
    const ligneActif = lignes.find((l) => l.textContent?.includes('actif'))
    expect(ligneActif?.querySelectorAll('td')[colonne]?.textContent).toBe('Le vocabulaire du bilan')

    // Review Focus nº 5 : la case d’une fiche sans chantier reste vide. Un tiret
    // ou un « — » se lirait comme un nom de chantier dans une colonne de noms.
    const ligneGroupe = lignes.find((l) => l.textContent?.includes('groupe'))
    expect(ligneGroupe?.querySelectorAll('td')[colonne]?.textContent).toBe('')
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

    // Seule assertion qui prouve que la page nourrit réellement ses deux enfants
    // en chantiers : sans elle, remplacer la liste par un tableau vide laisse
    // toute la suite au vert, et la colonne affiche le slug brut.
    expect(html).toContain('Le vocabulaire du bilan')
  })
})

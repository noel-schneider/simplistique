import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PageChantier, { generateMetadata, generateStaticParams } from './page'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

describe('generateStaticParams', () => {
  it('énumère les chantiers du corpus, et eux seuls', () => {
    const slugs = generateStaticParams().map((params) => params.slug)
    expect(slugs).toContain('vocabulaire-du-bilan')
    // L’exclusivité compte autant que l’inclusion : une implémentation qui
    // concaténerait fiches et chantiers resterait verte sur la seule présence.
    expect(slugs).not.toContain('actif-comptabilite')
    expect(slugs).not.toContain('groupe-mathematiques')
  })
})

describe('generateMetadata', () => {
  it('reprend le nom en titre et le résumé en description', async () => {
    const metadonnees = await generateMetadata({
      params: Promise.resolve({ slug: 'vocabulaire-du-bilan' }),
    })
    expect(metadonnees.title).toBe('Le vocabulaire du bilan')
    expect(metadonnees.description).toContain('n’opposent rien de clair')
  })

  it('rend un objet vide pour un slug inconnu', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ slug: 'absent' }) })).toEqual({})
  })
})

describe('PageChantier', () => {
  it('liste les fiches du chantier, et elles seules', async () => {
    const page = await PageChantier({
      params: Promise.resolve({ slug: 'vocabulaire-du-bilan' }),
    })
    const html = renderToStaticMarkup(page)

    // On vise les liens, et non la simple présence des mots : « actif » et
    // « passif » apparaissent déjà dans le texte du chantier, donc un
    // `toContain('actif')` passerait même si la liste des fiches était vide.
    expect(html).toContain('href="/fiches/actif-comptabilite"')
    expect(html).toContain('href="/fiches/passif-comptabilite"')

    // « groupe » relève des mathématiques : aucune raison de figurer ici.
    expect(html).not.toContain('href="/fiches/groupe-mathematiques"')
  })

  it('annonce un chantier de démonstration', async () => {
    const page = await PageChantier({
      params: Promise.resolve({ slug: 'structures-algebriques' }),
    })

    // Le texte, et non le nom du composant : ce que cette page doit garantir,
    // c’est qu’un lecteur apprenne que la page est fictive avant de la lire.
    expect(renderToStaticMarkup(page)).toContain('fictive')
  })

  it('n’annonce rien sur un chantier réel', async () => {
    const page = await PageChantier({
      params: Promise.resolve({ slug: 'vocabulaire-du-bilan' }),
    })
    expect(renderToStaticMarkup(page)).not.toContain('fictive')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { trierFiches, VueListe, type Libelles } from './vue-liste'

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

const libelles: Libelles = {
  disciplines: new Map([
    ['mathematiques', 'Mathématiques'],
    ['escalade', 'Escalade'],
  ]),
  statuts: new Map([
    ['pointe', 'Pointé'],
    ['propose', 'Proposé'],
    ['rejete', 'Rejeté'],
  ]),
}

// Libellés dont l’ordre alphabétique DIFFÈRE de celui des slugs. C’est la seule
// façon de prouver que le tri porte sur le libellé affiché et non sur le slug :
// avec les libellés réels ci-dessus, « Escalade » et « escalade » se classent de
// la même façon, et un tri qui ignorerait complètement les libellés passerait
// quand même.
const LIBELLES_DIVERGENTS: Libelles = {
  disciplines: new Map([
    ['mathematiques', 'Algèbre'], // slug second, libellé premier
    ['escalade', 'Varappe'], // slug premier, libellé second
  ]),
  statuts: new Map([
    ['pointe', 'Signalé'], // slug premier, libellé troisième
    ['propose', 'Avancé'], // slug second, libellé premier
    ['rejete', 'Écarté'], // slug troisième, libellé second
  ]),
}

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const fiches: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', statut: 'pointe' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose', suggestions: ['contrôlé'] }),
  fiche({ slug: 'corps-mathematiques', terme: 'corps', statut: 'rejete' }),
]

function termesAffiches(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((ligne) => ligne.querySelector('td')!.textContent!.trim())
}

describe('trierFiches', () => {
  it('trie par terme dans l’ordre alphabétique français', () => {
    expect(trierFiches(fiches, 'terme', true, libelles).map((f) => f.terme)).toEqual([
      'corps',
      'groupe',
      'statique',
    ])
  })

  it('inverse l’ordre quand on le demande', () => {
    expect(trierFiches(fiches, 'terme', false, libelles).map((f) => f.terme)).toEqual([
      'statique',
      'groupe',
      'corps',
    ])
  })

  it('trie par libellé de discipline, pas par slug', () => {
    expect(trierFiches(fiches, 'discipline', true, LIBELLES_DIVERGENTS).map((f) => f.discipline)).toEqual([
      'mathematiques',
      'mathematiques',
      'escalade',
    ])
  })

  it('trie par libellé de statut, pas par slug', () => {
    expect(trierFiches(fiches, 'statut', true, LIBELLES_DIVERGENTS).map((f) => f.statut)).toEqual([
      'propose',
      'rejete',
      'pointe',
    ])
  })

  it('ne modifie pas le tableau reçu', () => {
    const copie = [...fiches]
    trierFiches(fiches, 'statut', false, libelles)
    expect(fiches).toEqual(copie)
  })
})

describe('VueListe', () => {
  it('trie par terme à l’ouverture', () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(termesAffiches()).toEqual(['corps', 'groupe', 'statique'])
  })

  it('lie chaque terme à sa fiche', () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(screen.getByRole('link', { name: 'groupe' })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
  })

  it('affiche un tiret quand il n’y a aucune suggestion', () => {
    render(<VueListe fiches={[fiches[0]]} libelles={libelles} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('trie par statut au clic sur l’en-tête', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    await userEvent.click(screen.getByRole('button', { name: 'Statut' }))
    expect(termesAffiches()).toEqual(['groupe', 'statique', 'corps'])
  })

  it('inverse le tri au second clic sur la même colonne', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    await userEvent.click(screen.getByRole('button', { name: 'Terme' }))
    expect(termesAffiches()).toEqual(['statique', 'groupe', 'corps'])
  })

  it('annonce la colonne triée et son sens aux lecteurs d’écran', async () => {
    render(<VueListe fiches={fiches} libelles={libelles} />)
    expect(screen.getByRole('columnheader', { name: /Terme/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: 'Statut' }))
    expect(screen.getByRole('columnheader', { name: /Statut/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /Terme/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('marque les seules fiches de démonstration', () => {
    render(
      <VueListe
        fiches={[
          fiche({ slug: 'anneau-mathematiques', terme: 'anneau', demonstration: true }),
          fiche({ slug: 'groupe-mathematiques', terme: 'groupe' }),
        ]}
        libelles={libelles}
      />,
    )

    // Par cellule et non par page : une pastille rendue au bon compte mais sur
    // la mauvaise ligne désignerait une analyse réelle comme fictive.
    const premieresCellules = screen
      .getAllByRole('row')
      .slice(1)
      .map((ligne) => ligne.querySelector('td')!.textContent!)

    expect(premieresCellules).toEqual(['anneaudémo', 'groupe'])
  })
})

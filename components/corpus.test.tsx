import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FicheIndex } from '../lib/content/schema'
import { Corpus, vueParDefaut } from './corpus'

const remplacer = vi.fn()
let recherche = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: remplacer, push: remplacer }),
  useSearchParams: () => new URLSearchParams(recherche),
  usePathname: () => '/fiches',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...reste }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}))

const disciplines = [
  { slug: 'mathematiques', nom: 'Mathématiques', couleur: '#e8703a', description: 'a' },
  { slug: 'escalade', nom: 'Escalade', couleur: '#3fa08a', description: 'b' },
]
const confusions = [{ slug: 'faux-ami-courant', nom: 'Faux ami courant', description: 'c' }]
const statuts = [
  { slug: 'pointe', nom: 'Pointé', description: 'd' },
  { slug: 'propose', nom: 'Proposé', description: 'e' },
  { slug: 'rejete', nom: 'Rejeté', description: 'f' },
]

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

const index: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe' }),
  fiche({ slug: 'temperament-escalade', terme: 'tempérament', discipline: 'escalade', statut: 'rejete' }),
  fiche({ slug: 'statique-escalade', terme: 'statique', discipline: 'escalade', statut: 'propose', suggestions: ['contrôlé'] }),
]

// Un élément neuf à chaque appel : React peut court-circuiter un re-rendu si on
// lui repasse exactement la même référence d’élément.
function elementCorpus() {
  return (
    <Corpus
      index={index}
      disciplines={disciplines}
      confusions={confusions}
      statuts={statuts}
      chantiers={[]}
    />
  )
}

function afficher() {
  return render(elementCorpus())
}

beforeEach(() => {
  remplacer.mockClear()
  recherche = ''
})

describe('Corpus — vue liste', () => {
  it('affiche toutes les fiches sans filtre', () => {
    afficher()
    expect(screen.getByRole('link', { name: /groupe/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /statique/ })).toBeInTheDocument()
  })

  it('lie chaque ligne à la fiche correspondante', () => {
    afficher()
    expect(screen.getByRole('link', { name: /groupe/ })).toHaveAttribute(
      'href',
      '/fiches/groupe-mathematiques',
    )
  })

  it('annonce le nombre de fiches affichées', () => {
    afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })
})

describe('Corpus — filtres et URL', () => {
  it('écrit le filtre de discipline dans l’URL', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Escalade' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?discipline=escalade', { scroll: false })
  })

  it('écrit le filtre de chantier dans l’URL', async () => {
    // Seul test à prouver que le quatrième groupe de filtres arrive jusqu’à
    // l’écran : la logique de `lib/filtrage.ts` est couverte par ailleurs, mais
    // on pourrait la débrancher de l’interface sans qu’aucun autre test bronche.
    render(
      <Corpus
        index={index}
        disciplines={disciplines}
        confusions={confusions}
        statuts={statuts}
        chantiers={[{ slug: 'vocabulaire-du-bilan', nom: 'Le vocabulaire du bilan' }]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Le vocabulaire du bilan' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?chantier=vocabulaire-du-bilan', {
      scroll: false,
    })
  })

  it('lit le filtre depuis l’URL au premier affichage', () => {
    recherche = 'discipline=escalade'
    afficher()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
  })

  it('ignore une discipline inconnue dans l’URL et affiche tout', () => {
    recherche = 'discipline=klingon'
    afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('ignore une vue inconnue dans l’URL et retombe sur un affichage valide', () => {
    recherche = 'vue=licorne'
    const { container } = afficher()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
    // Le compteur s'affiche quelle que soit la vue : la preuve que la vue
    // invalide a bien été ignorée est la présence du repli (la liste, par
    // défaut sans matchMedia), pas seulement le compteur.
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('filtre par recherche texte sans tenir compte des accents', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'tempe')
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
  })

  it('resynchronise ses filtres quand l’URL change sans passer par lui', () => {
    recherche = 'discipline=escalade'
    const { rerender } = afficher()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()

    // Lien interne vers /fiches sans paramètre : le segment de route ne change
    // pas, donc le composant reste monté avec son état.
    recherche = ''
    rerender(elementCorpus())

    expect(screen.getByRole('link', { name: /groupe/ })).toBeInTheDocument()
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('ne réécrit pas un filtre périmé après une resynchronisation', async () => {
    recherche = 'discipline=escalade'
    const { rerender } = afficher()
    recherche = ''
    rerender(elementCorpus())

    await userEvent.click(screen.getByRole('button', { name: 'Pointé' }))
    expect(remplacer).toHaveBeenLastCalledWith('/fiches?statut=pointe', { scroll: false })
  })

  it('trouve une fiche en tapant le nom de sa discipline', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'escalade')
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /statique/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
  })

  it('cumule deux filtres', () => {
    recherche = 'discipline=escalade&statut=rejete'
    afficher()
    expect(screen.getByText(/1 fiche/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
  })

  it('affiche un message explicite et un moyen d’effacer quand rien ne correspond', async () => {
    afficher()
    await userEvent.type(screen.getByRole('searchbox'), 'licorne')
    expect(screen.getByText(/aucune fiche/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /effacer les filtres/i }))
    expect(screen.getByText(/3 fiches/)).toBeInTheDocument()
  })

  it('conserve les filtres en changeant de vue', async () => {
    recherche = 'discipline=escalade'
    afficher()
    await userEvent.click(screen.getByRole('button', { name: /carte/i }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?vue=carte&discipline=escalade', { scroll: false })
  })
})

describe('Corpus — temporisation de la recherche', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // `userEvent` combiné aux faux minuteurs de Vitest bloque indéfiniment dans
  // cet environnement (React 19 + jsdom 30 + user-event 14.6.7) — reproduit
  // même sur un composant minimal sans rapport avec le corpus, qu'il s'agisse
  // de `.type()` ou de `.click()`. On utilise donc `fireEvent`, qui ne
  // dépend d'aucun minuteur, pour simuler la frappe et le clic ci-dessous.
  it('filtre l’affichage à chaque frappe, avant toute écriture dans l’URL', () => {
    afficher()
    const champ = screen.getByRole('searchbox')

    fireEvent.change(champ, { target: { value: 't' } })
    fireEvent.change(champ, { target: { value: 'te' } })
    fireEvent.change(champ, { target: { value: 'tempe' } })

    expect(screen.getByRole('link', { name: /tempérament/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /groupe/ })).not.toBeInTheDocument()
    expect(remplacer).not.toHaveBeenCalled()
  })

  it('n’écrit dans l’URL que 200 ms après la dernière frappe, en un seul appel', () => {
    afficher()
    const champ = screen.getByRole('searchbox')

    // Chaque frappe est espacée de 100 ms (moins que la temporisation) : si
    // elle ne l'annulait pas, la précédente écrirait quand même dans l'URL.
    fireEvent.change(champ, { target: { value: 't' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(champ, { target: { value: 'te' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(champ, { target: { value: 'tempe' } })
    expect(remplacer).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)

    expect(remplacer).toHaveBeenCalledTimes(1)
    expect(remplacer).toHaveBeenCalledWith('/fiches?q=tempe', { scroll: false })
  })

  it('les clics sur les filtres restent immédiats, sans attendre la temporisation', () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Escalade' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?discipline=escalade', { scroll: false })
  })
})

// jsdom ne fournit pas matchMedia : on l’injecte pour les deux tests qui ont
// besoin d’une largeur d’écran, et on le retire ensuite.
function simulerGrandEcran(grandEcran: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (requete: string) => ({ matches: grandEcran, media: requete }) as MediaQueryList,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as { matchMedia?: unknown }).matchMedia
})

describe('vueParDefaut', () => {
  it('se replie sur la liste quand matchMedia n’est pas disponible', () => {
    // C’est l’état par défaut de jsdom, donc celui de tous les autres tests.
    expect(vueParDefaut()).toBe('liste')
  })
})

describe('Corpus — bascule entre les deux vues', () => {
  it('affiche la carte quand l’URL le demande', () => {
    recherche = 'vue=carte'
    const { container } = afficher()
    // La légende de la carte dessine déjà trois cercles, quel que soit le
    // nombre de fiches affichées : compter les cercles ne prouverait rien.
    // Seuls les points de fiches sont des liens.
    expect(screen.getAllByRole('link')).toHaveLength(index.length)
    expect(container.querySelector('table')).toBeNull()
  })

  it('affiche la liste quand l’URL le demande', () => {
    recherche = 'vue=liste'
    const { container } = afficher()
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('choisit la liste par défaut sur petit écran', () => {
    simulerGrandEcran(false)
    const { container } = afficher()
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('choisit la carte par défaut sur grand écran', () => {
    simulerGrandEcran(true)
    const { container } = afficher()
    expect(screen.getAllByRole('link')).toHaveLength(index.length)
    expect(container.querySelector('table')).toBeNull()
  })

  it('garde la recherche texte en passant à la carte', async () => {
    recherche = 'q=tempe'
    afficher()
    await userEvent.click(screen.getByRole('button', { name: /carte/i }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?vue=carte&q=tempe', { scroll: false })
  })

  it('n’écrit pas la vue dans l’URL tant qu’on n’a pas basculé', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Escalade' }))
    expect(remplacer).toHaveBeenCalledWith('/fiches?discipline=escalade', { scroll: false })
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Votes } from './votes'

const ALTERNATIVES = [
  { texte: 'avoir', empreinte: 'aaaa1111bbbb2222' },
  { texte: 'ressources', empreinte: 'cccc3333dddd4444' },
]

function reponse(corps: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(corps), { status }))
}

const VIDE = { fiche: 0, alternatives: {}, miens: { fiche: false, alternatives: [] } }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => reponse(VIDE)))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Votes', () => {
  it('pose la question de la fiche', async () => {
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    expect(await screen.findByRole('button', { name: /vous a-t-il gêné/i })).toBeInTheDocument()
  })

  it('affiche les compteurs reçus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reponse({
          fiche: 12,
          alternatives: { aaaa1111bbbb2222: 7 },
          miens: { fiche: false, alternatives: [] },
        }),
      ),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(await screen.findByText('7')).toBeInTheDocument()
  })

  it('incrémente immédiatement au clic, avant la réponse du serveur', async () => {
    let resoudre: (r: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => new Promise<Response>((r) => (resoudre = r))),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await userEvent.click(await screen.findByRole('button', { name: /vous a-t-il gêné/i }))
    expect(await screen.findByText('1')).toBeInTheDocument()

    resoudre(
      new Response(
        JSON.stringify({ fiche: 1, alternatives: {}, miens: { fiche: true, alternatives: [] } }),
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument(),
    )
  })

  it('revient en arrière si l’envoi échoue', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => Promise.reject(new Error('réseau'))),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    const bouton = await screen.findByRole('button', { name: /vous a-t-il gêné/i })
    await userEvent.click(bouton)

    // On vise le compteur de ce bouton-là : les deux alternatives affichent aussi
    // `0`, et un `getByText('0')` global trouverait trois éléments.
    await waitFor(() => expect(bouton).toHaveTextContent('0'))
    // Et on vérifie que `miens` est revenu lui aussi : sans cette assertion, un
    // retour en arrière qui remettrait le compteur sans déposer le vote passerait.
    expect(bouton).toHaveAttribute('aria-pressed', 'false')
  })

  it('se réaligne silencieusement sur un 409 au lieu d’afficher une erreur', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => reponse({ erreur: 'deja' }, 409))
        // `7` est inatteignable par l'optimisme, qui n'incrémente que de 1 : voir ce
        // chiffre prouve qu'une vraie relecture a eu lieu et a été utilisée.
        .mockImplementationOnce(() =>
          reponse({ fiche: 7, alternatives: {}, miens: { fiche: true, alternatives: [] } }),
        ),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await userEvent.click(await screen.findByRole('button', { name: /vous a-t-il gêné/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /annuler/i })).toHaveTextContent('7'),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // La spec exige le silence pour le 409 : aucune phrase supplémentaire, et donc
    // aucun second `role="status"` à côté de celui, toujours présent, du compteur.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('affiche un message calme sur un 429, et le compteur revient à zéro', async () => {
    // La spec demande le silence pour le 409 et la base absente, pas pour le 429 : un
    // lecteur qui atteint la limite horaire verrait sinon le compteur bouger puis
    // revenir, sans explication.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => reponse({ erreur: 'trop' }, 429))
        .mockImplementationOnce(() => reponse(VIDE)),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    const bouton = await screen.findByRole('button', { name: /vous a-t-il gêné/i })
    await userEvent.click(bouton)

    await waitFor(() => expect(bouton).toHaveTextContent('0'))
    expect(
      await screen.findByText(
        'Vous avez voté beaucoup de fois cette heure-ci. Réessayez plus tard.',
      ),
    ).toBeInTheDocument()
  })

  it('n’affiche aucun message sur un 404 : il n’est pas couvert par le silence du 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => reponse({ erreur: 'inconnu' }, 404))
        .mockImplementationOnce(() => reponse(VIDE)),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await userEvent.click(await screen.findByRole('button', { name: /vous a-t-il gêné/i }))
    expect(
      await screen.findByText('Cette fiche a changé depuis l’ouverture de la page. Rechargez-la.'),
    ).toBeInTheDocument()
  })

  it('propose d’annuler ce qu’on a déjà voté', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reponse({
          fiche: 3,
          alternatives: {},
          miens: { fiche: true, alternatives: [] },
        }),
      ),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    expect(await screen.findByRole('button', { name: /annuler/i })).toBeInTheDocument()
  })

  it('reste entièrement silencieux quand la base est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reponse({ erreur: 'indisponible' }, 503)))
    const { container } = render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await waitFor(() => expect(container.querySelector('[data-charge]')).not.toBeNull())
    // Un texte visible sans rôle ARIA échapperait à `queryByRole` : on vérifie donc
    // qu'il n'y a rien à lire du tout, et que le conteneur est bien masqué.
    expect(container.textContent).toBe('')
    expect(container.querySelector('[data-charge]')).toHaveAttribute('hidden')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('n’affiche aucune question d’alternative quand la fiche n’en a pas', async () => {
    render(<Votes fiche="f" alternatives={[]} />)
    expect(await screen.findByRole('button', { name: /vous a-t-il gêné/i })).toBeInTheDocument()
    expect(screen.queryByText('avoir')).not.toBeInTheDocument()
  })

  it('annonce poliment un compteur à zéro', async () => {
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await screen.findByRole('button', { name: /vous a-t-il gêné/i })
    expect(screen.getByRole('status')).toHaveTextContent('Personne n’a encore été gêné')
  })

  it('accorde la phrase au singulier pour un seul vote', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reponse({ fiche: 1, alternatives: {}, miens: { fiche: false, alternatives: [] } }),
      ),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await screen.findByRole('button', { name: /vous a-t-il gêné/i })
    expect(screen.getByRole('status')).toHaveTextContent('Une personne a été gênée')
  })

  it('ignore une réponse dépassée quand deux bascules se croisent', async () => {
    // Le cas qui laissait l'affichage durablement faux : on vote, on annule, et la
    // réponse de l'annulation arrive AVANT celle du vote. L'état final doit refléter
    // la dernière action de l'utilisateur, pas la dernière réponse reçue.
    let resoudrePost: (r: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => reponse(VIDE))
        .mockImplementationOnce(() => new Promise<Response>((r) => (resoudrePost = r)))
        .mockImplementationOnce(() =>
          reponse({ fiche: 0, alternatives: {}, miens: { fiche: false, alternatives: [] } }),
        ),
    )
    render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    const bouton = await screen.findByRole('button', { name: /vous a-t-il gêné/i })

    await userEvent.click(bouton)
    await userEvent.click(bouton)

    resoudrePost(
      new Response(
        JSON.stringify({ fiche: 1, alternatives: {}, miens: { fiche: true, alternatives: [] } }),
      ),
    )

    await waitFor(() => expect(bouton).toHaveAttribute('aria-pressed', 'false'))
    expect(bouton).toHaveTextContent('0')
  })

  it('refuse un `alternatives` reçu comme tableau au lieu d’un objet', async () => {
    // Seule faute de ce corps, pour que le test tombe si et seulement si cette
    // vérification-là disparaît : en JavaScript un tableau est un objet non nul, donc
    // sans elle chaque compteur d’alternative vaudrait zéro en silence.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reponse({ fiche: 1, alternatives: [], miens: { fiche: false, alternatives: [] } }),
      ),
    )
    const { container } = render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await waitFor(() => expect(container.querySelector('[data-charge]')).not.toBeNull())
    expect(container.querySelector('[data-charge]')).toHaveAttribute('hidden')
    expect(container.textContent).toBe('')
  })

  it('refuse un `miens.alternatives` qui ne contient pas des chaînes', async () => {
    // Seule faute de ce corps. Sans cette vérification, chaque `includes` répondrait
    // `false` et le lecteur verrait « non voté » sur un vote qu’il vient d’émettre.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reponse({ fiche: 1, alternatives: {}, miens: { fiche: false, alternatives: [42] } }),
      ),
    )
    const { container } = render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await waitFor(() => expect(container.querySelector('[data-charge]')).not.toBeNull())
    expect(container.querySelector('[data-charge]')).toHaveAttribute('hidden')
    expect(container.textContent).toBe('')
  })

  it('reste silencieux si le serveur répond 200 avec un corps inattendu', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reponse({ bonjour: 'je ne suis pas un état' })))
    const { container } = render(<Votes fiche="f" alternatives={ALTERNATIVES} />)
    await waitFor(() => expect(container.querySelector('[data-charge]')).not.toBeNull())
    // L’assertion qui compte est celle sur `hidden`. Sans la validation de forme, le
    // rendu lève une TypeError que vitest classe en « Unhandled Error » : la suite
    // reste verte et le conteneur finit vide, donc un `textContent` à '' ne prouve
    // rien. Exiger le repli masqué distingue le silence voulu du plantage.
    expect(container.querySelector('[data-charge]')).toHaveAttribute('hidden')
    expect(container.textContent).toBe('')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

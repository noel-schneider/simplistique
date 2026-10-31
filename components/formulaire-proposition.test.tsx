import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FormulaireProposition } from './formulaire-proposition'

function reponse(corps: unknown, status: number) {
  return Promise.resolve(new Response(JSON.stringify(corps), { status }))
}

const POURQUOI = 'Je croyais que ce mot voulait dire autre chose que son sens réel.'

async function remplir() {
  const u = userEvent.setup()
  await u.type(screen.getByLabelText(/Le terme/), 'Énergie')
  await u.type(screen.getByLabelText(/Pourquoi/), POURQUOI)
  return u
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(() => reponse({ ok: true }, 201))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FormulaireProposition', () => {
  it('envoie les champs saisis en JSON', async () => {
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.type(screen.getByLabelText(/Discipline/), 'Physique')
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/propositions')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      terme: 'Énergie',
      discipline: 'Physique',
      pourquoi: POURQUOI,
      suggestion: '',
      contact: '',
      site: '',
    })
  })

  it('annonce le minimum de 20 caractères dans l’aide de « pourquoi »', () => {
    render(<FormulaireProposition />)
    // Sans l’indication, l’auteur ne découvre le minimum qu’au refus du serveur.
    expect(screen.getByLabelText(/Pourquoi/)).toHaveAccessibleDescription(/20 caractères minimum/)
  })

  it('affiche « Merci, la proposition est arrivée » après 201', async () => {
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(await screen.findByText('Merci, la proposition est arrivée')).toBeInTheDocument()
  })

  it('affiche les champs en erreur après 400', async () => {
    fetchMock.mockImplementation(() => reponse({ erreur: 'invalide', champs: ['pourquoi'] }, 400))
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))

    const champ = await screen.findByLabelText(/Pourquoi/)
    await waitFor(() => expect(champ).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByLabelText(/Le terme/)).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/pourquoi/i)
    expect(champ).toHaveValue(POURQUOI)
  })

  it('affiche « Trop de propositions d’un coup : nouvel envoi possible dans une heure » après 429', async () => {
    fetchMock.mockImplementation(() => reponse({ erreur: 'trop' }, 429))
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(
      await screen.findByText('Trop de propositions d’un coup : nouvel envoi possible dans une heure'),
    ).toBeInTheDocument()
  })

  it('affiche un message d’indisponibilité après 503, sans perdre la saisie', async () => {
    fetchMock.mockImplementation(() => reponse({ erreur: 'indisponible', cause: 'base' }, 503))
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(await screen.findByText(/pas disponible|indisponible/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Le terme/)).toHaveValue('Énergie')
    expect(screen.getByLabelText(/Pourquoi/)).toHaveValue(POURQUOI)
  })

  it('affiche le même message après une erreur réseau, sans perdre la saisie', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('réseau')))
    render(<FormulaireProposition />)
    const u = await remplir()
    await u.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(await screen.findByText(/pas disponible|indisponible/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Pourquoi/)).toHaveValue(POURQUOI)
  })

  it('le champ piège est hors écran et exclu de la tabulation', () => {
    const { container } = render(<FormulaireProposition />)
    const piege = container.querySelector('input[name="site"]') as HTMLInputElement
    expect(piege).not.toBeNull()
    expect(piege).toHaveAttribute('tabindex', '-1')
    expect(piege).toHaveAttribute('autocomplete', 'off')
    expect(piege.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(piege.closest('div')).toHaveClass('absolute')
  })
})

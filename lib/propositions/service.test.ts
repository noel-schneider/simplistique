import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { depotEnMemoire, type DepotDePropositions } from './depot'
import { LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE, LIMITE_PROPOSITIONS_PAR_HEURE, soumettre } from './service'

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)
const CORPS = { terme: 'Actif', pourquoi: 'Le mot dit le contraire de ce qu’il désigne.' }

describe('soumettre', () => {
  let depot: DepotDePropositions

  beforeEach(() => {
    depot = depotEnMemoire()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enregistre une proposition valide', async () => {
    expect(await soumettre(depot, CORPS, ALICE)).toEqual({ type: 'ok' })
    expect(await depot.nonTraitees()).toMatchObject([
      { terme: 'Actif', discipline: '', pourquoi: CORPS.pourquoi, suggestion: '', contact: '' },
    ])
  })

  it('n’écrit rien pour un corps invalide', async () => {
    expect(await soumettre(depot, { terme: 'Actif' }, ALICE)).toEqual({ type: 'invalide', champs: ['pourquoi'] })
    expect(await depot.nonTraitees()).toEqual([])
  })

  it('n’écrit rien pour un piège mais répond ok', async () => {
    expect(await soumettre(depot, { ...CORPS, site: 'http://spam' }, ALICE)).toEqual({ type: 'ok' })
    expect(await depot.nonTraitees()).toEqual([])
    // Le piège ne consomme pas non plus le quota de l’empreinte.
    expect(await depot.nombreDepuis(ALICE, new Date(0))).toBe(0)
  })

  it('refuse la 6e proposition dans l’heure', async () => {
    expect(LIMITE_PROPOSITIONS_PAR_HEURE).toBe(5)
    for (let i = 0; i < LIMITE_PROPOSITIONS_PAR_HEURE; i++) {
      expect(await soumettre(depot, CORPS, ALICE)).toEqual({ type: 'ok' })
    }
    expect(await soumettre(depot, CORPS, ALICE)).toEqual({ type: 'trop' })
    expect(await depot.nonTraitees()).toHaveLength(LIMITE_PROPOSITIONS_PAR_HEURE)
  })

  it('la limite est par auteur', async () => {
    for (let i = 0; i < LIMITE_PROPOSITIONS_PAR_HEURE; i++) await soumettre(depot, CORPS, ALICE)
    expect(await soumettre(depot, CORPS, BOB)).toEqual({ type: 'ok' })
  })

  it('refuse un caractère de contrôle sans rien écrire', async () => {
    expect(await soumettre(depot, { ...CORPS, terme: 'Act\u0000if' }, ALICE)).toEqual({
      type: 'invalide',
      champs: ['terme'],
    })
    expect(await depot.nonTraitees()).toEqual([])
  })

  it('refuse la 51e proposition dans l’heure, même d’auteurs différents', async () => {
    expect(LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE).toBe(50)
    for (let i = 0; i < LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE; i++) {
      expect(await soumettre(depot, CORPS, `auteur-${i}`)).toEqual({ type: 'ok' })
    }
    expect(await soumettre(depot, CORPS, 'auteur-neuf')).toEqual({ type: 'trop' })
    expect(await depot.nonTraitees()).toHaveLength(LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE)
  })

  it('le plafond global ignore les propositions de plus d’une heure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T10:00:00Z'))
    for (let i = 0; i < LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE; i++) await soumettre(depot, CORPS, `auteur-${i}`)
    vi.setSystemTime(new Date('2026-10-31T11:00:01Z'))
    expect(await soumettre(depot, CORPS, 'auteur-neuf')).toEqual({ type: 'ok' })
  })
})

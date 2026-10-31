import { beforeEach, describe, expect, it } from 'vitest'
import { depotEnMemoire, type DepotDePropositions } from './depot'
import { LIMITE_PROPOSITIONS_PAR_HEURE, soumettre } from './service'

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)
const CORPS = { terme: 'Actif', pourquoi: 'Le mot dit le contraire de ce qu’il désigne.' }

describe('soumettre', () => {
  let depot: DepotDePropositions

  beforeEach(() => {
    depot = depotEnMemoire()
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
})

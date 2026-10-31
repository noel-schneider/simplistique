import { describe, expect, it } from 'vitest'
import { depotEnMemoire, type Proposition } from './depot'

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)

function proposition(terme: string): Proposition {
  return { terme, discipline: '', pourquoi: 'x'.repeat(20), suggestion: '', contact: '' }
}

describe('depotEnMemoire (propositions)', () => {
  it('liste les non traitées dans l’ordre d’arrivée, avec un id et une date', async () => {
    const depot = depotEnMemoire()
    await depot.ajouter(proposition('Actif'), ALICE)
    await depot.ajouter(proposition('Groupe'), BOB)
    const liste = await depot.nonTraitees()
    expect(liste.map((p) => p.terme)).toEqual(['Actif', 'Groupe'])
    expect(liste[0].id).not.toBe(liste[1].id)
    expect(liste[0].creeLe).toBeInstanceOf(Date)
    // L’empreinte de l’auteur sert à la limite de débit, pas à la modération.
    expect(liste[0]).not.toHaveProperty('auteur')
  })

  it('marque une proposition traitée et la retire de la liste', async () => {
    const depot = depotEnMemoire()
    await depot.ajouter(proposition('Actif'), ALICE)
    const [{ id }] = await depot.nonTraitees()
    expect(await depot.marquerTraitee(id)).toBe('traitee')
    expect(await depot.nonTraitees()).toEqual([])
    // Rejouer la commande ne doit pas faire croire que l’id n’existe pas.
    expect(await depot.marquerTraitee(id)).toBe('traitee')
    expect(await depot.marquerTraitee(id + 1000)).toBe('absente')
  })

  it('compte les propositions récentes par auteur, traitées comprises', async () => {
    const depot = depotEnMemoire()
    await depot.ajouter(proposition('Actif'), ALICE)
    await depot.ajouter(proposition('Groupe'), ALICE)
    await depot.ajouter(proposition('Anneau'), BOB)
    const [{ id }] = await depot.nonTraitees()
    await depot.marquerTraitee(id)
    expect(await depot.nombreDepuis(ALICE, new Date(Date.now() - 60_000))).toBe(2)
    expect(await depot.nombreDepuis(ALICE, new Date(Date.now() + 60_000))).toBe(0)
  })
})

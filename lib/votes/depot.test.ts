import { beforeEach, describe, expect, it } from 'vitest'
import { depotEnMemoire, type DepotDeVotes } from './depot'

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)

describe('depotEnMemoire', () => {
  let depot: DepotDeVotes

  beforeEach(() => {
    depot = depotEnMemoire()
  })

  it('part vide', async () => {
    expect(await depot.compter('groupe-mathematiques')).toEqual({ fiche: 0, alternatives: {} })
  })

  it('compte un vote de fiche', async () => {
    expect(await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)).toBe('ajoute')
    expect(await depot.compter('f')).toEqual({ fiche: 1, alternatives: {} })
  })

  it('compte un vote d’alternative séparément du vote de fiche', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: 'aaaa1111bbbb2222' }, ALICE)
    expect(await depot.compter('f')).toEqual({
      fiche: 1,
      alternatives: { aaaa1111bbbb2222: 1 },
    })
  })

  it('refuse le même vote deux fois', async () => {
    expect(await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)).toBe('ajoute')
    expect(await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)).toBe('deja')
    expect((await depot.compter('f')).fiche).toBe(1)
  })

  it('compte deux votants distincts', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: null }, BOB)
    expect((await depot.compter('f')).fiche).toBe(2)
  })

  it('sépare les fiches', async () => {
    await depot.ajouter({ fiche: 'f1', alternative: null }, ALICE)
    expect((await depot.compter('f2')).fiche).toBe(0)
  })

  it('dit ce qu’un votant a voté, et rien de ce qu’ont voté les autres', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: 'aaaa1111bbbb2222' }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: 'cccc3333dddd4444' }, BOB)

    expect(await depot.votesDe('f', ALICE)).toEqual({
      fiche: true,
      alternatives: ['aaaa1111bbbb2222'],
    })
    expect(await depot.votesDe('f', BOB)).toEqual({
      fiche: false,
      alternatives: ['cccc3333dddd4444'],
    })
  })

  it('retire un vote et décrémente le compteur', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    expect(await depot.retirer({ fiche: 'f', alternative: null }, ALICE)).toBe('retire')
    expect((await depot.compter('f')).fiche).toBe(0)
    expect((await depot.votesDe('f', ALICE)).fiche).toBe(false)
  })

  it('retirer un vote absent ne fait rien', async () => {
    expect(await depot.retirer({ fiche: 'f', alternative: null }, ALICE)).toBe('absent')
    expect((await depot.compter('f')).fiche).toBe(0)
  })

  it('retirer le vote d’un autre ne retire rien', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    expect(await depot.retirer({ fiche: 'f', alternative: null }, BOB)).toBe('absent')
    expect((await depot.compter('f')).fiche).toBe(1)
  })

  it('compte les votes récents d’un votant, toutes fiches confondues', async () => {
    const avant = new Date(Date.now() - 60_000)
    await depot.ajouter({ fiche: 'f1', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f2', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f1', alternative: null }, BOB)

    expect(await depot.nombreDepuis(ALICE, avant)).toBe(2)
    expect(await depot.nombreDepuis(BOB, avant)).toBe(1)
  })

  it('ne compte pas les votes antérieurs à la date demandée', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    const apres = new Date(Date.now() + 60_000)
    expect(await depot.nombreDepuis(ALICE, apres)).toBe(0)
  })
})

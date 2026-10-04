import { Client } from 'pg'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { depotPostgres, type Executeur } from './depot-postgres'
import type { DepotDeVotes } from './depot'
import { CHEMIN_MIGRATION, instructionsSql } from './migration'

const URL_TEST = process.env.DATABASE_URL_TEST

// Ces tests exigent un vrai PostgreSQL 15 ou plus : ils vérifient la contrainte
// d’unicité, c’est-à-dire exactement ce qu’un dépôt en mémoire reproduirait de
// travers. Tester la déduplication contre un faux qui déduplique ne teste rien.
describe.skipIf(!URL_TEST)('depotPostgres contre un vrai PostgreSQL', () => {
  let client: Client
  let depot: DepotDeVotes
  const ALICE = 'a'.repeat(64)
  const BOB = 'b'.repeat(64)

  beforeAll(async () => {
    client = new Client({ connectionString: URL_TEST })
    await client.connect()
    // On applique la migration par le même chemin que la production (une
    // instruction à la fois), pour prouver que le découpage produit des
    // instructions valides contre un vrai PostgreSQL.
    const instructions = instructionsSql(readFileSync(join(process.cwd(), CHEMIN_MIGRATION), 'utf8'))
    for (const instruction of instructions) {
      await client.query(instruction)
    }

    const executer: Executeur = async (sql, parametres) =>
      (await client.query(sql, parametres)).rows as Record<string, unknown>[]
    depot = depotPostgres(executer)
  })

  afterAll(async () => {
    await client?.end()
  })

  beforeEach(async () => {
    await client.query('TRUNCATE votes')
  })

  it('compte un vote de fiche et un vote d’alternative séparément', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: 'aaaa1111bbbb2222' }, ALICE)
    expect(await depot.compter('f')).toEqual({
      fiche: 1,
      alternatives: { aaaa1111bbbb2222: 1 },
    })
  })

  // Le test qui justifie à lui seul l’existence de ce fichier.
  it('la contrainte bloque un second vote de FICHE du même votant', async () => {
    expect(await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)).toBe('ajoute')
    expect(await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)).toBe('deja')
    const { rows } = await client.query('SELECT count(*)::int AS n FROM votes')
    expect(rows[0].n).toBe(1)
  })

  it('la contrainte bloque un second vote d’ALTERNATIVE du même votant', async () => {
    await depot.ajouter({ fiche: 'f', alternative: 'aaaa1111bbbb2222' }, ALICE)
    expect(await depot.ajouter({ fiche: 'f', alternative: 'aaaa1111bbbb2222' }, ALICE)).toBe('deja')
  })

  it('deux votes concurrents du même votant n’en laissent qu’un', async () => {
    // Deux clients distincts, pour que les deux INSERT arrivent réellement en
    // concurrence côté serveur : un seul pg.Client sérialise ses requêtes sur
    // une connexion unique, et ne prouverait rien de plus qu’un doublon simple.
    const cible = { fiche: 'f', alternative: null }
    const clientA = new Client({ connectionString: URL_TEST })
    const clientB = new Client({ connectionString: URL_TEST })
    await clientA.connect()
    await clientB.connect()
    try {
      const executerA: Executeur = async (sql, parametres) =>
        (await clientA.query(sql, parametres)).rows as Record<string, unknown>[]
      const executerB: Executeur = async (sql, parametres) =>
        (await clientB.query(sql, parametres)).rows as Record<string, unknown>[]
      const depotA = depotPostgres(executerA)
      const depotB = depotPostgres(executerB)
      const issues = await Promise.all([depotA.ajouter(cible, ALICE), depotB.ajouter(cible, ALICE)])
      expect(issues.filter((i) => i === 'ajoute')).toHaveLength(1)
      expect(issues.filter((i) => i === 'deja')).toHaveLength(1)
      const { rows } = await client.query('SELECT count(*)::int AS n FROM votes')
      expect(rows[0].n).toBe(1)
    } finally {
      await clientA.end()
      await clientB.end()
    }
  })

  it('dit ce qu’un votant a voté sans révéler les autres', async () => {
    await depot.ajouter({ fiche: 'f', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f', alternative: 'cccc3333dddd4444' }, BOB)
    expect(await depot.votesDe('f', ALICE)).toEqual({ fiche: true, alternatives: [] })
    expect(await depot.votesDe('f', BOB)).toEqual({
      fiche: false,
      alternatives: ['cccc3333dddd4444'],
    })
  })

  it('retire un vote, et ne retire pas celui d’un autre', async () => {
    const cible = { fiche: 'f', alternative: null }
    await depot.ajouter(cible, ALICE)
    expect(await depot.retirer(cible, BOB)).toBe('absent')
    expect(await depot.retirer(cible, ALICE)).toBe('retire')
    expect((await depot.compter('f')).fiche).toBe(0)
  })

  it('compte les votes récents par votant', async () => {
    await depot.ajouter({ fiche: 'f1', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f2', alternative: null }, ALICE)
    await depot.ajouter({ fiche: 'f1', alternative: null }, BOB)
    const depuis = new Date(Date.now() - 60_000)
    expect(await depot.nombreDepuis(ALICE, depuis)).toBe(2)
    const apres = new Date(Date.now() + 60_000)
    expect(await depot.nombreDepuis(ALICE, apres)).toBe(0)
  })
})

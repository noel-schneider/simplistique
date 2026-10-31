import { Client } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Executeur } from '../votes/depot-postgres'
import { appliquerLesMigrations } from '../votes/migration-test'
import type { DepotDePropositions, Proposition } from './depot'
import { depotPostgres } from './depot-postgres'

const URL_TEST = process.env.DATABASE_URL_TEST

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)

function proposition(terme: string, contact = ''): Proposition {
  return { terme, discipline: 'Comptabilité', pourquoi: 'x'.repeat(20), suggestion: 'Avoirs', contact }
}

// Contre un vrai PostgreSQL : prouve que la migration 002 crée bien les colonnes
// que les requêtes lisent, et que `bigint` et `timestamptz` reviennent dans les
// types promis par l’interface.
describe.skipIf(!URL_TEST)('depotPostgres (propositions) contre un vrai PostgreSQL', () => {
  let client: Client
  let depot: DepotDePropositions

  beforeAll(async () => {
    client = new Client({ connectionString: URL_TEST })
    await client.connect()
    await appliquerLesMigrations(client)
    const executer: Executeur = async (sql, parametres) =>
      (await client.query(sql, parametres)).rows as Record<string, unknown>[]
    depot = depotPostgres(executer)
  })

  afterAll(async () => {
    await client?.end()
  })

  beforeEach(async () => {
    await client.query('TRUNCATE propositions')
  })

  it('enregistre puis liste les non traitées dans l’ordre, sans l’auteur', async () => {
    await depot.ajouter(proposition('Actif', 'moi@exemple.org'), ALICE)
    await depot.ajouter(proposition('Groupe'), BOB)
    const liste = await depot.nonTraitees()
    expect(liste.map((p) => p.terme)).toEqual(['Actif', 'Groupe'])
    expect(liste[0]).toMatchObject({ discipline: 'Comptabilité', suggestion: 'Avoirs', contact: 'moi@exemple.org' })
    expect(typeof liste[0].id).toBe('number')
    expect(liste[0].creeLe).toBeInstanceOf(Date)
    expect(liste[0]).not.toHaveProperty('auteur')
  })

  it('marque traitée, garde la première date, et distingue un id absent', async () => {
    await depot.ajouter(proposition('Actif'), ALICE)
    const [{ id }] = await depot.nonTraitees()
    expect(await depot.marquerTraitee(id)).toBe('traitee')
    const { rows: avant } = await client.query('SELECT traitee_le FROM propositions WHERE id = $1', [id])
    expect(await depot.marquerTraitee(id)).toBe('traitee')
    const { rows: apres } = await client.query('SELECT traitee_le FROM propositions WHERE id = $1', [id])
    expect(apres[0].traitee_le).toEqual(avant[0].traitee_le)
    expect(await depot.nonTraitees()).toEqual([])
    expect(await depot.marquerTraitee(id + 1000)).toBe('absente')
  })

  it('compte les propositions récentes par auteur', async () => {
    await depot.ajouter(proposition('Actif'), ALICE)
    await depot.ajouter(proposition('Groupe'), ALICE)
    await depot.ajouter(proposition('Anneau'), BOB)
    expect(await depot.nombreDepuis(ALICE, new Date(Date.now() - 60_000))).toBe(2)
    expect(await depot.nombreDepuis(ALICE, new Date(Date.now() + 60_000))).toBe(0)
  })

  it('compte toutes les propositions récentes, tous auteurs confondus', async () => {
    await depot.ajouter(proposition('Actif'), ALICE)
    await depot.ajouter(proposition('Anneau'), BOB)
    await client.query("UPDATE propositions SET cree_le = now() - interval '2 hours' WHERE terme = 'Anneau'")
    expect(await depot.nombreTotalDepuis(new Date(Date.now() - 60 * 60_000))).toBe(1)
    expect(await depot.nombreTotalDepuis(new Date(Date.now() - 3 * 60 * 60_000))).toBe(2)
  })

  it('la migration 003 crée l’index sur cree_le', async () => {
    const { rows } = await client.query(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'propositions' AND indexname = 'propositions_par_date'",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].indexdef).toContain('(cree_le)')
  })
})

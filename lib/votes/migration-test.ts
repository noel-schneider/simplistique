import type { Client } from 'pg'
import { instructionsDeToutesLesMigrations } from './migration'

/**
 * Applique les migrations par le même chemin que la production (une instruction
 * à la fois), pour prouver que le découpage produit des instructions valides
 * contre un vrai PostgreSQL.
 *
 * Le verrou consultatif sérialise les fichiers de test, que Vitest lance en
 * parallèle contre la même base : deux `CREATE TABLE IF NOT EXISTS` simultanés
 * sur une table absente peuvent tous deux tenter de la créer, et le second
 * échoue sur l’unicité du catalogue (23505) malgré le `IF NOT EXISTS`.
 */
export async function appliquerLesMigrations(client: Client): Promise<void> {
  await client.query('SELECT pg_advisory_lock(7351)')
  try {
    for (const instruction of instructionsDeToutesLesMigrations()) {
      await client.query(instruction)
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(7351)')
  }
}

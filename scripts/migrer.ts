import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { CHEMIN_MIGRATION, instructionsSql } from '../lib/votes/migration'

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL est absente. Rien n’a été fait.')
    process.exitCode = 1
    return
  }

  const sql = neon(url)
  const instructions = instructionsSql(readFileSync(join(process.cwd(), CHEMIN_MIGRATION), 'utf8'))
  if (instructions.length === 0) {
    console.error('La migration est vide. Rien n’a été fait.')
    process.exitCode = 1
    return
  }
  await sql.transaction(instructions.map((instruction) => sql.query(instruction)))

  // `CREATE TABLE IF NOT EXISTS` ne fait rien contre une table `votes`
  // préexistante qui n’aurait pas cette contrainte : la migration « réussirait »
  // sans jamais la créer, et chaque vote répondrait alors 503 pour toujours.
  const contrainte = await sql.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'vote_unique'",
  )
  if (contrainte.length === 0) {
    console.error(
      'La table votes existe mais la contrainte vote_unique est absente : une table antérieure occupe la place. Aucun vote ne pourra être enregistré.',
    )
    process.exitCode = 1
    return
  }

  console.log(`Migration appliquée : ${instructions.length} instructions, la table votes et ses index existent.`)
}

principal().catch((erreur: unknown) => {
  // Jamais `erreur.message` : le pilote y réinjecte la chaîne de connexion complète,
  // mot de passe compris. Le nom de la classe et le code SQLSTATE, eux, sont des
  // constantes du pilote et de PostgreSQL — ils diagnostiquent sans rien révéler.
  const classe = erreur instanceof Error ? erreur.constructor.name : 'erreur inconnue'
  const code = (erreur as { code?: string } | null)?.code
  console.error(`La migration a échoué : ${classe}${code ? ` (${code})` : ''}.`)
  process.exitCode = 1
})

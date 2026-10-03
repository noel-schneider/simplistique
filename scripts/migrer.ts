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
  console.log(`Migration appliquée : ${instructions.length} instructions, la table votes et ses index existent.`)
}

principal().catch((erreur) => {
  console.error('La migration a échoué :', erreur instanceof Error ? erreur.message : erreur)
  process.exitCode = 1
})

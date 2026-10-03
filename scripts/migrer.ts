import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL est absente. Rien n’a été fait.')
    process.exitCode = 1
    return
  }

  const sql = neon(url)
  const migration = readFileSync(join(process.cwd(), 'migrations/001-votes.sql'), 'utf8')
  await sql.query(migration)
  console.log('Migration appliquée : la table votes et ses index existent.')
}

principal()

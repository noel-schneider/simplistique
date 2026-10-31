import { neon } from '@neondatabase/serverless'
import { fichiersDeMigration, instructionsDeToutesLesMigrations } from '../lib/votes/migration'

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL est absente. Rien n’a été fait.')
    process.exitCode = 1
    return
  }

  const sql = neon(url)
  const fichiers = fichiersDeMigration()
  const instructions = instructionsDeToutesLesMigrations()
  if (instructions.length === 0) {
    console.error('Aucune instruction dans migrations/*.sql. Rien n’a été fait.')
    process.exitCode = 1
    return
  }
  // Une seule transaction pour tous les fichiers : une instruction qui échoue dans
  // `002` annule aussi `001`, et la base ne reste jamais à moitié migrée.
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

  // `to_regclass` rend NULL pour une table absente, sans lever d’erreur. Après une
  // transaction réussie, elle ne peut manquer que si un fichier a disparu du dossier.
  const propositions = await sql.query("SELECT to_regclass('public.propositions') IS NOT NULL AS existe")
  if (propositions[0]?.existe !== true) {
    console.error(
      'La table propositions est absente : migrations/002-propositions.sql n’a pas été appliquée. Aucune proposition ne pourra être enregistrée.',
    )
    process.exitCode = 1
    return
  }

  console.log(
    `Migrations appliquées (${fichiers.join(', ')}) : ${instructions.length} instructions, les tables votes et propositions existent.`,
  )
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

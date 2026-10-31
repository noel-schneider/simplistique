import { depotPostgres } from '../lib/propositions/depot-postgres'
import { executeurNeon } from '../lib/votes/depot-postgres'
import { neutraliserControles as n } from './affichage-propositions'

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL est absente. Rien n’a été fait.')
    process.exitCode = 1
    return
  }
  const depot = depotPostgres(executeurNeon(url))
  const args = process.argv.slice(2)

  if (args[0] === '--traiter') {
    const id = Number(args[1])
    if (!Number.isInteger(id) || id <= 0 || args.length !== 2) {
      console.error('Usage : npm run propositions -- --traiter <id>')
      process.exitCode = 1
      return
    }
    const resultat = await depot.marquerTraitee(id)
    if (resultat === 'absente') {
      console.error(`La proposition ${id} n’existe pas.`)
      process.exitCode = 1
      return
    }
    console.log(`Proposition ${id} marquée comme traitée.`)
    return
  }

  if (args.length > 0) {
    console.error('Usage : npm run propositions [-- --traiter <id>]')
    process.exitCode = 1
    return
  }

  const lignes = await depot.nonTraitees()
  if (lignes.length === 0) {
    console.log('Aucune proposition en attente.')
    return
  }
  console.log(`${lignes.length} proposition(s) en attente :`)
  // Tout champ vient d’un inconnu : il passe par `n` avant d’atteindre le terminal.
  for (const p of lignes) {
    console.log(`\n#${p.id} — ${p.creeLe.toISOString()}`)
    console.log(`  Terme : ${n(p.terme)}`)
    console.log(`  Discipline : ${n(p.discipline) || '(non précisée)'}`)
    console.log(`  Pourquoi : ${n(p.pourquoi)}`)
    console.log(`  Suggestion : ${n(p.suggestion) || '(aucune)'}`)
    // Le contact n’apparaît qu’ici : il est destiné au modérateur, nulle part ailleurs.
    console.log(`  Contact : ${n(p.contact) || '(aucun)'}`)
  }
  console.log('\nPour clore une proposition : npm run propositions -- --traiter <id>')
}

principal().catch((erreur: unknown) => {
  // Jamais `erreur.message` : le pilote y réinjecte la chaîne de connexion complète.
  const classe = erreur instanceof Error ? erreur.constructor.name : 'erreur inconnue'
  const code = (erreur as { code?: string } | null)?.code
  console.error(`La commande a échoué : ${classe}${code ? ` (${code})` : ''}.`)
  process.exitCode = 1
})

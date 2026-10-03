import { neon } from '@neondatabase/serverless'
import { getFiches } from '../lib/content/fiches'
import { empreinteAlternative } from '../lib/votes/empreintes'

export type LigneDeVote = { fiche: string; alternative: string | null; n: number }

/**
 * Une ligne est orpheline si sa fiche n’existe plus, ou si son alternative ne figure
 * plus parmi celles de la fiche. Un vote de fiche (`alternative` nulle) sur une fiche
 * existante n’est jamais orphelin.
 */
export function orphelines(
  lignes: LigneDeVote[],
  connues: Map<string, Set<string>>,
): LigneDeVote[] {
  return lignes.filter(({ fiche, alternative }) => {
    const empreintes = connues.get(fiche)
    if (!empreintes) return true
    return alternative !== null && !empreintes.has(alternative)
  })
}

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL est absente. Rien à vérifier.')
    process.exitCode = 1
    return
  }

  const connues = new Map<string, Set<string>>()
  for (const fiche of getFiches()) {
    connues.set(fiche.slug, new Set(fiche.suggestions.map(empreinteAlternative)))
  }

  const sql = neon(url)
  // La requête est la seule chose ici qui dépende du réseau. Sans ce filet, une base
  // injoignable ou une table pas encore migrée donnerait une trace Node brute, qui
  // peut porter le nom d’hôte de la base — alors que le cas « DATABASE_URL absente »
  // est, lui, soigneusement expliqué. On ne répète jamais le message du pilote.
  let lignes: LigneDeVote[]
  try {
    lignes = (await sql.query(
      'SELECT fiche, alternative, count(*)::int AS n FROM votes GROUP BY fiche, alternative',
    )) as LigneDeVote[]
  } catch {
    console.error(
      'La base n’a pas répondu, ou la table votes n’existe pas encore. Lancez `npm run migrer`.',
    )
    process.exitCode = 1
    return
  }

  const lignesOrphelines = orphelines(lignes, connues)

  if (lignesOrphelines.length === 0) {
    console.log('Aucun vote orphelin : toutes les lignes désignent une fiche et une alternative existantes.')
    return
  }

  console.log(`${lignesOrphelines.length} groupe(s) de votes orphelins :`)
  for (const { fiche, alternative, n } of lignesOrphelines) {
    const quoi = alternative === null ? 'fiche supprimée' : `alternative disparue (${alternative})`
    console.log(`  ${fiche} — ${quoi} — ${n} vote(s)`)
  }
  console.log('\nCes lignes ne sont jamais affichées : les compteurs se calculent à partir du corpus.')
}

principal().catch(() => {
  // Le message du pilote n’est jamais répété : il peut porter un nom d’hôte.
  console.error('La vérification des votes orphelins a échoué.')
  process.exitCode = 1
})

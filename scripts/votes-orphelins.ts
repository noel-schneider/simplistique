import { neon } from '@neondatabase/serverless'
import { getFiches } from '../lib/content/fiches'
import { empreinteAlternative } from '../lib/votes/empreintes'

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
  const lignes = (await sql.query(
    'SELECT fiche, alternative, count(*)::int AS n FROM votes GROUP BY fiche, alternative',
  )) as { fiche: string; alternative: string | null; n: number }[]

  const orphelines = lignes.filter(({ fiche, alternative }) => {
    const empreintes = connues.get(fiche)
    if (!empreintes) return true
    return alternative !== null && !empreintes.has(alternative)
  })

  if (orphelines.length === 0) {
    console.log('Aucun vote orphelin : toutes les lignes désignent une fiche et une alternative existantes.')
    return
  }

  console.log(`${orphelines.length} groupe(s) de votes orphelins :`)
  for (const { fiche, alternative, n } of orphelines) {
    const quoi = alternative === null ? 'fiche supprimée' : `alternative disparue (${alternative})`
    console.log(`  ${fiche} — ${quoi} — ${n} vote(s)`)
  }
  console.log('\nCes lignes ne sont jamais affichées : les compteurs se calculent à partir du corpus.')
}

principal()

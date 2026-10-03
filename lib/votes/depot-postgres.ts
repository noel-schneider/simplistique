import { neon } from '@neondatabase/serverless'
import type { Cible, Comptes, DepotDeVotes, Miens } from './depot'

/**
 * Le pilote de Neon parle en HTTP et ne sait pas joindre un PostgreSQL
 * ordinaire ; `pg` ne convient pas en production serverless, où chaque
 * invocation ouvrirait une connexion qui ne se referme pas assez vite. Cette
 * indirection permet d’exercer les requêtes SQL elles-mêmes contre un vrai
 * PostgreSQL en intégration, en ne changeant que le transport.
 */
export type Executeur = (sql: string, parametres: unknown[]) => Promise<Record<string, unknown>[]>

export function executeurNeon(url: string): Executeur {
  const sql = neon(url)
  return async (texte, parametres) =>
    (await sql.query(texte, parametres)) as Record<string, unknown>[]
}

export function depotPostgres(executer: Executeur): DepotDeVotes {
  return {
    async compter(fiche) {
      const lignes = await executer(
        'SELECT alternative, count(*)::int AS n FROM votes WHERE fiche = $1 GROUP BY alternative',
        [fiche],
      )
      const comptes: Comptes = { fiche: 0, alternatives: {} }
      for (const l of lignes) {
        const n = Number(l.n)
        if (l.alternative === null) comptes.fiche = n
        else comptes.alternatives[String(l.alternative)] = n
      }
      return comptes
    },

    async votesDe(fiche, votant) {
      const lignes = await executer(
        'SELECT alternative FROM votes WHERE fiche = $1 AND votant = $2',
        [fiche, votant],
      )
      const miens: Miens = { fiche: false, alternatives: [] }
      for (const l of lignes) {
        if (l.alternative === null) miens.fiche = true
        else miens.alternatives.push(String(l.alternative))
      }
      return miens
    },

    async ajouter(cible: Cible, votant) {
      // ON CONFLICT DO NOTHING laisse la contrainte arbitrer, y compris entre
      // deux requêtes concurrentes : la base tranche, pas le code applicatif.
      const lignes = await executer(
        `INSERT INTO votes (fiche, alternative, votant) VALUES ($1, $2, $3)
         ON CONFLICT ON CONSTRAINT vote_unique DO NOTHING
         RETURNING id`,
        [cible.fiche, cible.alternative, votant],
      )
      return lignes.length > 0 ? 'ajoute' : 'deja'
    },

    async retirer(cible: Cible, votant) {
      const lignes = await executer(
        `DELETE FROM votes
         WHERE fiche = $1 AND alternative IS NOT DISTINCT FROM $2 AND votant = $3
         RETURNING id`,
        [cible.fiche, cible.alternative, votant],
      )
      return lignes.length > 0 ? 'retire' : 'absent'
    },

    async nombreDepuis(votant, depuis) {
      const lignes = await executer(
        'SELECT count(*)::int AS n FROM votes WHERE votant = $1 AND cree_le >= $2',
        [votant, depuis.toISOString()],
      )
      return Number(lignes[0]?.n ?? 0)
    },
  }
}

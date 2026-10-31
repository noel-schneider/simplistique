import type { Executeur } from '../votes/depot-postgres'
import type { DepotDePropositions, PropositionEnregistree } from './depot'

/**
 * Même transport que les votes (`executeurNeon` en production, `pg` en
 * intégration) : seules les requêtes changent.
 */
export function depotPostgres(executer: Executeur): DepotDePropositions {
  return {
    async ajouter(p, auteur) {
      await executer(
        `INSERT INTO propositions (terme, discipline, pourquoi, suggestion, contact, auteur)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.terme, p.discipline, p.pourquoi, p.suggestion, p.contact, auteur],
      )
    },

    async nombreDepuis(auteur, depuis) {
      const lignes = await executer(
        'SELECT count(*)::int AS n FROM propositions WHERE auteur = $1 AND cree_le >= $2',
        [auteur, depuis.toISOString()],
      )
      return Number(lignes[0]?.n ?? 0)
    },

    async nombreTotalDepuis(depuis) {
      // Servie par l’index `propositions_par_date` (migration 003) : celui de 002
      // commence par `auteur` et ne sert pas une requête qui n’en filtre aucun.
      const lignes = await executer('SELECT count(*)::int AS n FROM propositions WHERE cree_le >= $1', [
        depuis.toISOString(),
      ])
      return Number(lignes[0]?.n ?? 0)
    },

    async nonTraitees() {
      // `auteur` n’est volontairement pas lu : la modération n’en a pas l’usage.
      const lignes = await executer(
        `SELECT id, cree_le, terme, discipline, pourquoi, suggestion, contact
         FROM propositions WHERE traitee_le IS NULL ORDER BY id`,
        [],
      )
      return lignes.map(
        (l): PropositionEnregistree => ({
          // `bigint` arrive en chaîne (pg comme Neon) : les identifiants restent loin
          // de 2^53, la conversion est sans perte.
          id: Number(l.id),
          // `pg` rend un `Date`, le pilote HTTP de Neon une chaîne ISO : `new Date`
          // accepte les deux.
          creeLe: new Date(l.cree_le as string | Date),
          terme: String(l.terme),
          discipline: String(l.discipline),
          pourquoi: String(l.pourquoi),
          suggestion: String(l.suggestion),
          contact: String(l.contact),
        }),
      )
    },

    async marquerTraitee(id) {
      // `coalesce` garde la première date si la commande est rejouée ; la ligne est
      // quand même rendue, donc une seconde demande répond `traitee` et non `absente`.
      const lignes = await executer(
        `UPDATE propositions SET traitee_le = coalesce(traitee_le, now())
         WHERE id = $1 RETURNING id`,
        [id],
      )
      return lignes.length > 0 ? 'traitee' : 'absente'
    },
  }
}

export type Cible = { fiche: string; alternative: string | null }
export type Comptes = { fiche: number; alternatives: Record<string, number> }
export type Miens = { fiche: boolean; alternatives: string[] }

export interface DepotDeVotes {
  compter(fiche: string): Promise<Comptes>
  votesDe(fiche: string, votant: string): Promise<Miens>
  ajouter(cible: Cible, votant: string): Promise<'ajoute' | 'deja'>
  retirer(cible: Cible, votant: string): Promise<'retire' | 'absent'>
  nombreDepuis(votant: string, depuis: Date): Promise<number>
}

type Ligne = { fiche: string; alternative: string | null; votant: string; creeLe: Date }

function memeVote(l: Ligne, cible: Cible, votant: string): boolean {
  return l.fiche === cible.fiche && l.alternative === cible.alternative && l.votant === votant
}

/**
 * Implémentation de test. La production utilise `depotPostgres`.
 * Elle reproduit volontairement la sémantique de la contrainte d’unicité SQL,
 * y compris le fait qu’un vote de fiche (alternative nulle) se déduplique —
 * ce que `UNIQUE` ferait à tort sans `NULLS NOT DISTINCT`.
 */
export function depotEnMemoire(): DepotDeVotes {
  const lignes: Ligne[] = []

  return {
    async compter(fiche) {
      const comptes: Comptes = { fiche: 0, alternatives: {} }
      for (const l of lignes) {
        if (l.fiche !== fiche) continue
        if (l.alternative === null) comptes.fiche += 1
        else comptes.alternatives[l.alternative] = (comptes.alternatives[l.alternative] ?? 0) + 1
      }
      return comptes
    },

    async votesDe(fiche, votant) {
      const siennes = lignes.filter((l) => l.fiche === fiche && l.votant === votant)
      return {
        fiche: siennes.some((l) => l.alternative === null),
        alternatives: siennes
          .map((l) => l.alternative)
          .filter((a): a is string => a !== null),
      }
    },

    async ajouter(cible, votant) {
      if (lignes.some((l) => memeVote(l, cible, votant))) return 'deja'
      lignes.push({ ...cible, votant, creeLe: new Date() })
      return 'ajoute'
    },

    async retirer(cible, votant) {
      const i = lignes.findIndex((l) => memeVote(l, cible, votant))
      if (i === -1) return 'absent'
      lignes.splice(i, 1)
      return 'retire'
    },

    async nombreDepuis(votant, depuis) {
      return lignes.filter((l) => l.votant === votant && l.creeLe >= depuis).length
    },
  }
}

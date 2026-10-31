import type { Proposition } from './validation'

export type { Proposition }

export type PropositionEnregistree = Proposition & { id: number; creeLe: Date }

/**
 * `auteur` est l’empreinte de `empreinteVotant` : elle ne sert qu’à la limite de
 * débit et n’est jamais relue pour la modération — `nonTraitees` ne la rend pas.
 */
export interface DepotDePropositions {
  ajouter(p: Proposition, auteur: string): Promise<void>
  nombreDepuis(auteur: string, depuis: Date): Promise<number>
  /** Tous auteurs confondus, pour le plafond global. */
  nombreTotalDepuis(depuis: Date): Promise<number>
  nonTraitees(): Promise<PropositionEnregistree[]>
  marquerTraitee(id: number): Promise<'traitee' | 'absente'>
}

type Ligne = PropositionEnregistree & { auteur: string; traiteeLe: Date | null }

/**
 * Implémentation de test. La production utilise `depotPostgres`, dont elle
 * reproduit la sémantique : ordre d’arrivée, et `marquerTraitee` qui répond
 * `traitee` à une seconde demande sans écraser la première date.
 */
export function depotEnMemoire(): DepotDePropositions {
  const lignes: Ligne[] = []
  let suivant = 1

  return {
    async ajouter(p, auteur) {
      lignes.push({ ...p, id: suivant++, creeLe: new Date(), auteur, traiteeLe: null })
    },

    async nombreDepuis(auteur, depuis) {
      return lignes.filter((l) => l.auteur === auteur && l.creeLe >= depuis).length
    },

    async nombreTotalDepuis(depuis) {
      return lignes.filter((l) => l.creeLe >= depuis).length
    },

    async nonTraitees() {
      return lignes
        .filter((l) => l.traiteeLe === null)
        .map(({ id, creeLe, terme, discipline, pourquoi, suggestion }) => ({
          id,
          creeLe,
          terme,
          discipline,
          pourquoi,
          suggestion,
        }))
    },

    async marquerTraitee(id) {
      const ligne = lignes.find((l) => l.id === id)
      if (!ligne) return 'absente'
      ligne.traiteeLe ??= new Date()
      return 'traitee'
    },
  }
}

import type { Fiche } from '../content/schema'
import type { Cible, Comptes, DepotDeVotes, Miens } from './depot'
import { empreinteAlternative } from './empreintes'

/**
 * Un lecteur curieux qui parcourt tout le corpus émet une quinzaine de votes au
 * maximum. Trente par heure laisse de la marge sans ouvrir la porte au script
 * qui chercherait à remplir la base — le vrai risque n’étant pas qu’on fausse
 * les compteurs, mais qu’on sature le quota gratuit.
 */
export const LIMITE_PAR_HEURE = 30

export type Issue =
  | { type: 'ok'; comptes: Comptes; miens: Miens }
  | { type: 'inconnu' }
  | { type: 'deja' }
  | { type: 'absent' }
  | { type: 'trop' }

export function empreintesDeLaFiche(fiche: Fiche): string[] {
  return fiche.suggestions.map(empreinteAlternative)
}

/**
 * Sans cette vérification, n’importe qui insère des lignes arbitraires : des
 * votes pour des fiches inventées, des alternatives qui n’existent pas. Le
 * corpus étant connu, c’est une comparaison en mémoire, sans requête.
 */
export function cibleValide(cible: Cible, fiche: Fiche | null): boolean {
  if (!fiche || fiche.slug !== cible.fiche) return false
  if (cible.alternative === null) return true
  return empreintesDeLaFiche(fiche).includes(cible.alternative)
}

async function etat(depot: DepotDeVotes, fiche: string, votant: string): Promise<Issue> {
  const [comptes, miens] = await Promise.all([depot.compter(fiche), depot.votesDe(fiche, votant)])
  return { type: 'ok', comptes, miens }
}

export async function lire(depot: DepotDeVotes, fiche: Fiche, votant: string): Promise<Issue> {
  return etat(depot, fiche.slug, votant)
}

export async function voter(
  depot: DepotDeVotes,
  cible: Cible,
  fiche: Fiche | null,
  votant: string,
): Promise<Issue> {
  if (!cibleValide(cible, fiche)) return { type: 'inconnu' }

  const depuis = new Date(Date.now() - 60 * 60 * 1000)
  if ((await depot.nombreDepuis(votant, depuis)) >= LIMITE_PAR_HEURE) return { type: 'trop' }

  if ((await depot.ajouter(cible, votant)) === 'deja') return { type: 'deja' }
  return etat(depot, cible.fiche, votant)
}

export async function annuler(
  depot: DepotDeVotes,
  cible: Cible,
  fiche: Fiche | null,
  votant: string,
): Promise<Issue> {
  if (!cibleValide(cible, fiche)) return { type: 'inconnu' }
  // Annuler n’est pas soumis à la limite : elle protège contre le remplissage
  // de la base, et une annulation en retire une ligne.
  if ((await depot.retirer(cible, votant)) === 'absent') return { type: 'absent' }
  return etat(depot, cible.fiche, votant)
}

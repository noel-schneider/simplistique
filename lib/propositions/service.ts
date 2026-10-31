import type { DepotDePropositions } from './depot'
import { validerProposition } from './validation'

/**
 * Quelqu’un qui a plusieurs termes en tête en envoie deux ou trois d’affilée ;
 * cinq par heure laisse cette marge. Au-delà, c’est un script : le risque n’est
 * pas la qualité (tout passe par la modération), mais la saturation du quota
 * gratuit de la base et d’une file de modération lue à la main.
 */
export const LIMITE_PROPOSITIONS_PAR_HEURE = 5

export type IssueDeProposition =
  | { type: 'ok' }
  | { type: 'invalide'; champs: string[] }
  | { type: 'trop' }

export async function soumettre(
  depot: DepotDePropositions,
  corps: unknown,
  auteur: string,
): Promise<IssueDeProposition> {
  const validation = validerProposition(corps)
  // Le piège répond comme un succès et n’écrit rien, sans même lire la base : pas
  // de ligne à modérer, et pas de quota consommé pour l’empreinte qui l’a déclenché.
  if ('piege' in validation) return { type: 'ok' }
  if (!validation.ok) return { type: 'invalide', champs: validation.champs }

  const depuis = new Date(Date.now() - 60 * 60 * 1000)
  if ((await depot.nombreDepuis(auteur, depuis)) >= LIMITE_PROPOSITIONS_PAR_HEURE) {
    return { type: 'trop' }
  }

  await depot.ajouter(validation.proposition, auteur)
  return { type: 'ok' }
}

import type { DepotDePropositions } from './depot'
import { validerProposition } from './validation'

/**
 * Quelqu’un qui a plusieurs termes en tête en envoie deux ou trois d’affilée ;
 * cinq par heure laisse cette marge. Au-delà, c’est un script : le risque n’est
 * pas la qualité (tout passe par la modération), mais la saturation du quota
 * gratuit de la base et d’une file de modération lue à la main.
 */
export const LIMITE_PROPOSITIONS_PAR_HEURE = 5

/**
 * La limite par auteur ne tient que tant que l’empreinte tient : un robot qui
 * change d’adresse ou de navigateur à chaque envoi la contourne. Ce plafond, tous
 * auteurs confondus, borne ce qu’il peut écrire en une heure ; cinquante reste
 * très au-dessus de ce qu’un site de cette taille reçoit honnêtement.
 */
export const LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE = 50

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
  if ((await depot.nombreTotalDepuis(depuis)) >= LIMITE_PROPOSITIONS_GLOBALE_PAR_HEURE) {
    return { type: 'trop' }
  }

  await depot.ajouter(validation.proposition, auteur)
  return { type: 'ok' }
}

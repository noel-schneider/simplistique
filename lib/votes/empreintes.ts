import { createHash } from 'node:crypto'
import { normaliser } from '../filtrage'

/**
 * Identifie une alternative par son texte et non par sa position dans le
 * tableau `suggestions`. Un index casserait silencieusement au premier
 * réordonnancement : les votes désigneraient autre chose et les compteurs
 * resteraient plausibles tout en étant faux.
 *
 * On réutilise `normaliser` (celle de la recherche) pour n'avoir qu'une seule
 * définition de « le même texte » dans le projet.
 */
export function empreinteAlternative(texte: string): string {
  return createHash('sha256').update(normaliser(texte)).digest('hex').slice(0, 16)
}

/** Première adresse de `x-forwarded-for`, que les mandataires remplissent en liste. */
export function adresseDeLEnTete(xForwardedFor: string | null): string {
  const premiere = (xForwardedFor ?? '').split(',')[0]?.trim()
  return premiere ? premiere : 'inconnue'
}

/**
 * Le sel est indispensable, pas décoratif : l'espace IPv4 fait quatre milliards
 * de valeurs, donc un haché non salé se casse par force brute en quelques
 * minutes. Sans sel, ce ne serait pas de l'anonymisation mais un déguisement —
 * d'où le refus de calculer plutôt qu'une dégradation silencieuse.
 */
export function empreinteVotant(sel: string, ip: string, navigateur: string): string {
  if (!sel.trim()) {
    throw new Error(
      'SEL_VOTES est vide ou absent : refus de calculer une empreinte de votant sans sel.',
    )
  }
  return createHash('sha256').update(`${sel}|${ip}|${navigateur}`).digest('hex')
}

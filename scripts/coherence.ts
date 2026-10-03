import { listerTitres, retirerCrochets } from '../lib/content/markdown'
import { LONGUEUR_MAX_RESUME, type Fiche } from '../lib/content/schema'

export type Avertissement = { slug: string; message: string }

const SEUIL_RESUME = Math.floor(LONGUEUR_MAX_RESUME * 0.95)

export function verifierCoherence(fiche: Fiche): Avertissement[] {
  const avertissements: string[] = []
  const titres = listerTitres(fiche.corps).map((t) => t.toLowerCase())

  if (!titres.includes('risques')) {
    avertissements.push(
      'aucune section « ## Risques » : le manifeste demande d\'identifier les risques de la modification',
    )
  }

  if (fiche.statut === 'pointe' && fiche.suggestions.length > 0) {
    avertissements.push(
      'statut « pointe » alors que des suggestions sont proposées : le statut devrait être « propose »',
    )
  }

  if (fiche.statut === 'propose' && fiche.suggestions.length === 0) {
    avertissements.push(
      'statut « propose » sans aucune suggestion : le statut devrait être « pointe »',
    )
  }

  if (fiche.resume.length >= SEUIL_RESUME) {
    avertissements.push(
      `resume de ${fiche.resume.length} caractères, proche de la limite de ${LONGUEUR_MAX_RESUME}`,
    )
  }

  if (fiche.modifie.getTime() < fiche.cree.getTime()) {
    avertissements.push('modifie est antérieur à cree')
  }

  if (retirerCrochets(fiche.corps).includes('[[')) {
    avertissements.push(
      'des crochets doubles survivent à l\'aplatissement : probablement un `[[` non fermé ou imbriqué, qui s\'affichera tel quel',
    )
  }

  return avertissements.map((message) => ({ slug: fiche.slug, message }))
}

export function verifierCorpus(fiches: Fiche[]): Avertissement[] {
  return fiches.flatMap(verifierCoherence)
}

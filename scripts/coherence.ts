import { listerTitres, retirerCrochets } from '../lib/content/markdown'
import { LONGUEUR_MAX_RESUME, type Fiche } from '../lib/content/schema'

export type Avertissement = { slug: string; message: string }

// 95 % de la limite dure : assez près pour prévenir avant le refus, assez loin
// pour ne pas crier sur un resume simplement bien rempli.
const SEUIL_RESUME = Math.floor(LONGUEUR_MAX_RESUME * 0.95)

export function verifierCoherence(fiche: Fiche): Avertissement[] {
  const avertissements: string[] = []
  const titres = listerTitres(fiche.corps).map((t) => t.toLowerCase())

  // Sous-chaîne et non égalité : « ## Risques et limites » ou « ## Les risques du
  // changement » traitent bien le sujet et ne doivent pas être signalés. Un
  // avertissement qui se trompe se fait ignorer, et ne garde plus rien.
  if (!titres.some((titre) => titre.includes('risques'))) {
    avertissements.push(
      'aucune section de niveau 2 dont le titre contient « risques » : le manifeste demande d\'identifier les risques de la modification',
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

  const aplati = retirerCrochets(fiche.corps)
  const positionCrochets = aplati.indexOf('[[')
  if (positionCrochets !== -1) {
    const extrait = aplati.slice(positionCrochets, positionCrochets + 40).split('\n')[0]
    avertissements.push(
      `des crochets doubles survivent à l'aplatissement, probablement un « [[ » non fermé ou imbriqué, qui s'affichera tel quel : « ${extrait} »`,
    )
  }

  return avertissements.map((message) => ({ slug: fiche.slug, message }))
}

export function verifierCorpus(fiches: Fiche[]): Avertissement[] {
  return fiches.flatMap(verifierCoherence)
}

// Le marqueur sert de point d'ancrage dans content/manifeste.md et
// content/contribuer.md, à remplacer par l'adresse réelle du dépôt une fois
// publié. Laissé entre chevrons, il est lu comme une balise HTML inconnue et
// disparaît silencieusement au rendu — entre accents graves, il survit comme
// du code littéral. Ce contrôle signale l'oubli sans jamais bloquer : la
// publication initiale, avant que l'adresse ne soit connue, en dépend.
const MARQUEUR_URL_DEPOT = 'URL-DU-DEPOT'

export function verifierDocuments(documents: { nom: string; texte: string }[]): Avertissement[] {
  return documents
    .filter((document) => document.texte.includes(MARQUEUR_URL_DEPOT))
    .map((document) => ({
      slug: document.nom,
      message: `le marqueur « ${MARQUEUR_URL_DEPOT} » est encore présent : à remplacer par l'adresse réelle du dépôt`,
    }))
}

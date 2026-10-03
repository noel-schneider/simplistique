import { getDocument, getFiches } from '../lib/content/fiches'
import { chargerTaxonomies, DOSSIER_CONTENU } from '../lib/content/taxonomies'
import { verifierCorpus, verifierDocuments } from './coherence'

function principal(): void {
  const taxonomies = chargerTaxonomies(DOSSIER_CONTENU)
  const fiches = getFiches(DOSSIER_CONTENU, taxonomies)
  const documents = (['manifeste', 'contribuer'] as const).map((nom) => ({
    nom,
    texte: getDocument(nom, DOSSIER_CONTENU),
  }))
  const avertissements = [...verifierCorpus(fiches), ...verifierDocuments(documents)]

  console.log(
    `${fiches.length} fiche(s), ${taxonomies.disciplines.length} discipline(s) — validation du schéma réussie.`,
  )

  if (avertissements.length === 0) {
    console.log('Aucun avertissement.')
    return
  }

  console.log(`\n${avertissements.length} avertissement(s) :`)
  for (const { slug, message } of avertissements) {
    console.log(`  ${slug} : ${message}`)
  }
  console.log('\nCes points ne bloquent pas le déploiement.')
}

principal()

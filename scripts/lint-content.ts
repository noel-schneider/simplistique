import { getChantiers } from '../lib/content/chantiers'
import { getDocument, getFiches } from '../lib/content/fiches'
import { chargerTaxonomies, DOSSIER_CONTENU } from '../lib/content/taxonomies'
import { verifierChantiers, verifierCorpus, verifierDocuments } from './coherence'

function principal(): void {
  const taxonomies = chargerTaxonomies(DOSSIER_CONTENU)
  const chantiers = getChantiers(DOSSIER_CONTENU, taxonomies)
  const fiches = getFiches(DOSSIER_CONTENU, taxonomies, chantiers)
  const documents = (['manifeste', 'contribuer'] as const).map((nom) => ({
    nom,
    texte: getDocument(nom, DOSSIER_CONTENU),
  }))
  const avertissements = [
    ...verifierCorpus(fiches),
    ...verifierChantiers(chantiers, fiches),
    ...verifierDocuments(documents),
  ]

  console.log(
    `${fiches.length} fiche(s), ${chantiers.length} chantier(s), ${taxonomies.disciplines.length} discipline(s) — validation du schéma réussie.`,
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

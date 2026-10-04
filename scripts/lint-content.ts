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

  // Le compte des pages fictives est affiché à chaque vérification, et non
  // seulement quand il y en a : c’est la seule façon de ne pas s’habituer à leur
  // présence, et de voir d’un coup d’œil le jour où il devrait tomber à zéro.
  const demonstrations =
    fiches.filter((fiche) => fiche.demonstration).length +
    chantiers.filter((chantier) => chantier.demonstration).length

  console.log(
    `${fiches.length} fiche(s), ${chantiers.length} chantier(s), ${taxonomies.disciplines.length} discipline(s) — validation du schéma réussie.`,
  )
  console.log(
    demonstrations === 0
      ? 'Aucune page de démonstration.'
      : `${demonstrations} page(s) de démonstration, à retirer avant une mise en avant du site.`,
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

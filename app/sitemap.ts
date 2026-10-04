import type { MetadataRoute } from 'next'
import { getChantiers } from '@/lib/content/chantiers'
import { getFiches } from '@/lib/content/fiches'
import { urlSite } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlSite()
  const fiches = getFiches()

  // La date la plus récente parmi toutes les fiches : seule date honnête pour
  // une page qui affiche le corpus plutôt qu'un contenu propre.
  const derniereModifDuCorpus = fiches.reduce(
    (plusRecente, fiche) => (fiche.modifie > plusRecente ? fiche.modifie : plusRecente),
    fiches[0]?.modifie ?? new Date(0),
  )

  // `/manifeste` et `/contribuer` sont des documents sans date de
  // modification connue : `lastModified` est optionnel dans la spec des
  // plans de site, et l'omettre est plus honnête que d'inventer une date
  // (ni la date du build, qui change sans que le contenu ait bougé, ni la
  // date de modification du fichier sur disque, qui ne reflète que l'heure
  // du dernier clone).
  const pagesDocuments: MetadataRoute.Sitemap = ['/manifeste', '/contribuer'].map((chemin) => ({
    url: `${base}${chemin}`,
  }))

  // `/` et `/fiches` affichent le corpus (l'accueil en donne les compteurs,
  // `/fiches` le catalogue) : la date la plus récente du corpus veut
  // réellement dire quelque chose pour elles.
  const pagesCorpus: MetadataRoute.Sitemap = ['/', '/fiches'].map((chemin) => ({
    url: `${base}${chemin}`,
    lastModified: derniereModifDuCorpus,
  }))

  // Les pages de démonstration restent visibles sur le site — c’est leur raison
  // d’être — mais n’entrent pas dans le plan de site : les faire indexer par un
  // moteur de recherche coûterait plus cher que ce qu’elles rapportent.
  const pagesFiches: MetadataRoute.Sitemap = fiches
    .filter((fiche) => !fiche.demonstration)
    .map((fiche) => ({
      url: `${base}/fiches/${fiche.slug}`,
      lastModified: fiche.modifie,
    }))

  const pagesChantiers: MetadataRoute.Sitemap = getChantiers()
    .filter((chantier) => !chantier.demonstration)
    .map((chantier) => ({
      url: `${base}/chantiers/${chantier.slug}`,
      lastModified: chantier.modifie,
    }))

  return [...pagesCorpus, ...pagesDocuments, ...pagesFiches, ...pagesChantiers]
}

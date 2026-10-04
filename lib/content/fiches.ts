import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { creerSchemaFiche, decrireErreursDeSchema, schemaSlug, type Fiche, type FicheIndex, type Taxonomies, type ChantierMeta } from './schema'
import { getChantiers } from './chantiers'

export { DOSSIER_CONTENU }

function lireFiche(
  dossier: string,
  fichier: string,
  taxonomies: Taxonomies,
  chantiers: ChantierMeta[],
): Fiche {
  const slug = fichier.replace(/\.md$/, '')
  if (!schemaSlug.test(slug)) {
    throw new Error(
      `${fichier} : slug de fiche invalide (« ${slug} ») — le nom de fichier doit être en minuscules, sans accent, sans espace, avec uniquement des chiffres et des tirets (forme attendue : <terme>-<discipline>.md)`,
    )
  }

  const chemin = join(dossier, 'fiches', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaFiche(taxonomies, chantiers).safeParse(data)

  if (!resultat.success) {
    const details = decrireErreursDeSchema(resultat.error.issues, data as Record<string, unknown>)
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug, ...resultat.data, corps: content }
}

export function getFiches(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): Fiche[] {
  const dossierFiches = join(dossier, 'fiches')
  if (!existsSync(dossierFiches)) return []

  return readdirSync(dossierFiches)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireFiche(dossier, f, taxonomies, chantiers))
    .sort((a, b) => a.terme.localeCompare(b.terme, 'fr'))
}

export function getFiche(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): Fiche | null {
  const fichier = `${slug}.md`
  const chemin = join(dossier, 'fiches', fichier)
  if (!existsSync(chemin)) return null
  return lireFiche(dossier, fichier, taxonomies, chantiers)
}

export function getIndex(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
  chantiers: ChantierMeta[] = getChantiers(dossier, taxonomies),
): FicheIndex[] {
  return getFiches(dossier, taxonomies, chantiers).map((fiche) => ({
    slug: fiche.slug,
    terme: fiche.terme,
    discipline: fiche.discipline,
    confusion: fiche.confusion,
    statut: fiche.statut,
    resume: fiche.resume,
    suggestions: fiche.suggestions,
    chantier: fiche.chantier,
  }))
}

export function getDocument(
  nom: 'manifeste' | 'contribuer',
  dossier: string = DOSSIER_CONTENU,
): string {
  return readFileSync(join(dossier, `${nom}.md`), 'utf8')
}

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { creerSchemaChantier, decrireErreursDeSchema, schemaSlug, type Chantier, type Taxonomies } from './schema'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

function lireChantier(dossier: string, fichier: string, taxonomies: Taxonomies): Chantier {
  const slug = fichier.replace(/\.md$/, '')
  if (!schemaSlug.test(slug)) {
    throw new Error(
      `${fichier} : slug de chantier invalide (« ${slug} ») — le nom de fichier doit être en minuscules, sans accent, sans espace, avec uniquement des chiffres et des tirets`,
    )
  }

  const chemin = join(dossier, 'chantiers', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaChantier(taxonomies).safeParse(data)

  if (!resultat.success) {
    const details = decrireErreursDeSchema(resultat.error.issues, data as Record<string, unknown>)
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug, ...resultat.data, corps: content }
}

export function getChantiers(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Chantier[] {
  const dossierChantiers = join(dossier, 'chantiers')
  if (!existsSync(dossierChantiers)) return []

  return readdirSync(dossierChantiers)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireChantier(dossier, f, taxonomies))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

export function getChantier(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Chantier | null {
  const fichier = `${slug}.md`
  if (!existsSync(join(dossier, 'chantiers', fichier))) return null
  return lireChantier(dossier, fichier, taxonomies)
}

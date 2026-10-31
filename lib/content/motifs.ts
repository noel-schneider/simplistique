import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { creerSchemaMotif, decrireErreursDeSchema, schemaSlug, type Motif, type Taxonomies } from './schema'
import { DOSSIER_CONTENU } from './taxonomies'

function lireMotif(dossier: string, fichier: string): Motif {
  const slug = fichier.replace(/\.md$/, '')
  if (!schemaSlug.test(slug)) {
    throw new Error(
      `${fichier} : slug de motif invalide (« ${slug} ») — le nom de fichier doit être en minuscules, sans accent, sans espace, avec uniquement des chiffres et des tirets`,
    )
  }

  const chemin = join(dossier, 'motifs', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaMotif().safeParse(data)

  if (!resultat.success) {
    const details = decrireErreursDeSchema(resultat.error.issues, data as Record<string, unknown>)
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug, ...resultat.data, corps: content }
}

// Le paramètre `taxonomies` n’est pas lu (un motif ne se rattache à aucune
// discipline, donc rien à charger) mais garde la signature des autres lecteurs de contenu, pour que
// les appelants passent partout les mêmes arguments.
export function getMotifs(
  dossier: string = DOSSIER_CONTENU,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _taxonomies?: Taxonomies,
): Motif[] {
  const dossierMotifs = join(dossier, 'motifs')
  if (!existsSync(dossierMotifs)) return []

  return readdirSync(dossierMotifs)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireMotif(dossier, f))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

export function getMotif(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _taxonomies?: Taxonomies,
): Motif | null {
  const fichier = `${slug}.md`
  if (!existsSync(join(dossier, 'motifs', fichier))) return null
  return lireMotif(dossier, fichier)
}

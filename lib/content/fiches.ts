import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { creerSchemaFiche, type Fiche, type FicheIndex, type Taxonomies } from './schema'

export { DOSSIER_CONTENU }

function lireFiche(dossier: string, fichier: string, taxonomies: Taxonomies): Fiche {
  const chemin = join(dossier, 'fiches', fichier)
  const { data, content } = matter(readFileSync(chemin, 'utf8'))
  const resultat = creerSchemaFiche(taxonomies).safeParse(data)

  if (!resultat.success) {
    const champs = data as Record<string, unknown>
    const details = resultat.error.issues
      .map((probleme) => {
        const champ = probleme.path.join('.') || '(racine)'
        const recu = probleme.path.length > 0 ? champs[String(probleme.path[0])] : undefined
        return recu === undefined
          ? `${champ} : ${probleme.message}`
          : `${champ} : ${probleme.message} (valeur reçue : ${JSON.stringify(recu)})`
      })
      .join(' ; ')
    throw new Error(`${fichier} : ${details}`)
  }

  return { slug: fichier.replace(/\.md$/, ''), ...resultat.data, corps: content }
}

export function getFiches(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Fiche[] {
  const dossierFiches = join(dossier, 'fiches')
  if (!existsSync(dossierFiches)) return []

  return readdirSync(dossierFiches)
    .filter((f) => f.endsWith('.md'))
    .map((f) => lireFiche(dossier, f, taxonomies))
    .sort((a, b) => a.terme.localeCompare(b.terme, 'fr'))
}

export function getFiche(
  slug: string,
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): Fiche | null {
  return getFiches(dossier, taxonomies).find((f) => f.slug === slug) ?? null
}

export function getIndex(
  dossier: string = DOSSIER_CONTENU,
  taxonomies: Taxonomies = chargerTaxonomies(dossier),
): FicheIndex[] {
  return getFiches(dossier, taxonomies).map((fiche) => ({
    slug: fiche.slug,
    terme: fiche.terme,
    discipline: fiche.discipline,
    confusion: fiche.confusion,
    statut: fiche.statut,
    resume: fiche.resume,
    suggestions: fiche.suggestions,
  }))
}

export function getDocument(
  nom: 'manifeste' | 'contribuer',
  dossier: string = DOSSIER_CONTENU,
): string {
  return readFileSync(join(dossier, `${nom}.md`), 'utf8')
}

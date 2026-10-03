import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'js-yaml'
import type { ZodType } from 'zod'
import {
  schemaDiscipline,
  schemaEntreeTaxonomie,
  STATUTS,
  type Discipline,
  type EntreeTaxonomie,
  type Taxonomies,
} from './schema'

export const DOSSIER_CONTENU = join(process.cwd(), 'content')

function chargerListe<T extends { slug: string }>(
  dossier: string,
  fichier: string,
  schema: ZodType<T>,
): T[] {
  const chemin = join(dossier, 'taxonomies', fichier)
  const brut = load(readFileSync(chemin, 'utf8'))

  if (!Array.isArray(brut)) {
    throw new Error(`${fichier} : le fichier doit contenir une liste d'entrées`)
  }

  const entrees = brut.map((entree, i) => {
    const resultat = schema.safeParse(entree)
    if (!resultat.success) {
      const details = resultat.error.issues
        .map((p) => `${p.path.join('.') || '(racine)'} : ${p.message}`)
        .join(' ; ')
      throw new Error(`${fichier}, entrée ${i + 1} : ${details}`)
    }
    return resultat.data
  })

  const vus = new Set<string>()
  for (const entree of entrees) {
    if (vus.has(entree.slug)) {
      throw new Error(`${fichier} : slug dupliqué « ${entree.slug} »`)
    }
    vus.add(entree.slug)
  }

  return entrees
}

export function chargerTaxonomies(dossier: string = DOSSIER_CONTENU): Taxonomies {
  const disciplines = chargerListe<Discipline>(dossier, 'disciplines.yml', schemaDiscipline)
  const confusions = chargerListe<EntreeTaxonomie>(dossier, 'confusions.yml', schemaEntreeTaxonomie)
  const statuts = chargerListe<EntreeTaxonomie>(dossier, 'statuts.yml', schemaEntreeTaxonomie)

  const attendus = [...STATUTS].sort().join(',')
  const trouves = statuts.map((s) => s.slug).sort().join(',')
  if (attendus !== trouves) {
    throw new Error(`statuts.yml : doit contenir exactement ${attendus}, trouvé ${trouves || '(rien)'}`)
  }

  if (disciplines.length === 0) throw new Error('disciplines.yml : au moins une discipline est requise')
  if (confusions.length === 0) throw new Error('confusions.yml : au moins un type de confusion est requis')

  return { disciplines, confusions, statuts }
}

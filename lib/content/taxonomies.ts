import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'js-yaml'
import type { ZodType } from 'zod'
import {
  schemaDiscipline,
  schemaEntreeTaxonomie,
  PREUVES,
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
      const slugBrut =
        entree !== null && typeof entree === 'object' && 'slug' in entree
          ? (entree as Record<string, unknown>).slug
          : undefined
      const identifiant =
        typeof slugBrut === 'string' && slugBrut.length > 0 ? ` (« ${slugBrut} »)` : ''
      throw new Error(`${fichier}, entrée ${i + 1}${identifiant} : ${details}`)
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
  const familles = chargerListe<EntreeTaxonomie>(dossier, 'familles.yml', schemaEntreeTaxonomie)
  const confusions = chargerListe<EntreeTaxonomie>(dossier, 'confusions.yml', schemaEntreeTaxonomie)
  const statuts = chargerListe<EntreeTaxonomie>(dossier, 'statuts.yml', schemaEntreeTaxonomie)

  const attendus = [...STATUTS].sort().join(',')
  const trouves = statuts.map((s) => s.slug).sort().join(',')
  if (attendus !== trouves) {
    throw new Error(`statuts.yml : doit contenir exactement ${attendus}, trouvé ${trouves || '(rien)'}`)
  }

  const preuves = chargerListe<EntreeTaxonomie>(dossier, 'preuves.yml', schemaEntreeTaxonomie)
  const preuvesAttendues = [...PREUVES].sort().join(',')
  const preuvesTrouvees = preuves.map((p) => p.slug).sort().join(',')
  if (preuvesAttendues !== preuvesTrouvees) {
    throw new Error(
      `preuves.yml doit contenir exactement ${preuvesAttendues}, trouvé ${preuvesTrouvees || '(rien)'}`,
    )
  }

  if (disciplines.length === 0) throw new Error('disciplines.yml : au moins une discipline est requise')
  if (familles.length === 0) throw new Error('familles.yml : au moins une famille est requise')

  // Une famille inconnue ferait disparaître la discipline de la carte sans
  // erreur : on échoue ici, au build, en nommant les deux.
  const slugsFamilles = new Set(familles.map((f) => f.slug))
  for (const d of disciplines) {
    if (!slugsFamilles.has(d.famille)) {
      throw new Error(`disciplines.yml : la discipline « ${d.slug} » cite la famille inconnue « ${d.famille} »`)
    }
  }

  if (confusions.length === 0) throw new Error('confusions.yml : au moins un type de confusion est requis')

  return { familles, disciplines, confusions, statuts, preuves }
}

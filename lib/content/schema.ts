import { z, type ZodType } from 'zod'

export type Statut = 'pointe' | 'propose' | 'rejete'
export const STATUTS = ['pointe', 'propose', 'rejete'] as const satisfies readonly Statut[]

// Réutilisée telle quelle pour valider le nom de fichier d'une fiche (voir
// `lireFiche` dans lib/content/fiches.ts), dont le slug n'est pas un champ de
// schéma mais le nom de fichier brut.
export const schemaSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const slug = z.string().regex(schemaSlug, 'slug invalide : minuscules, chiffres et tirets uniquement')

export const schemaEntreeTaxonomie = z.object({
  slug,
  nom: z.string().min(1),
  description: z.string().min(1),
})

export const schemaDiscipline = schemaEntreeTaxonomie.extend({
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur invalide : hexadécimal sur 6 chiffres'),
})

export type EntreeTaxonomie = z.infer<typeof schemaEntreeTaxonomie>
export type Discipline = z.infer<typeof schemaDiscipline>

export type Taxonomies = {
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}

export type FicheMeta = {
  slug: string
  terme: string
  discipline: string
  confusion: string
  statut: Statut
  resume: string
  suggestions: string[]
  cree: Date
  modifie: Date
}

export type Fiche = FicheMeta & { corps: string }

export const LONGUEUR_MAX_RESUME = 240

export function creerSchemaFiche(taxonomies: Taxonomies): ZodType<Omit<FicheMeta, 'slug'>> {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]
  const confusions = taxonomies.confusions.map((c) => c.slug) as [string, ...string[]]

  return z.object({
    terme: z.string().min(1),
    discipline: z.enum(disciplines),
    confusion: z.enum(confusions),
    statut: z.enum(STATUTS),
    // Les scalaires `>` du YAML gardent un saut de ligne final, qui partirait
    // tel quel dans <meta name="description"> et consommerait un caractère
    // du budget de 240 pour rien.
    resume: z.string().trim().min(1).max(LONGUEUR_MAX_RESUME),
    suggestions: z.array(z.string().min(1)),
    cree: z.coerce.date(),
    modifie: z.coerce.date(),
  })
}

export type FicheIndex = Omit<FicheMeta, 'cree' | 'modifie'>

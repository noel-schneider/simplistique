import { z } from 'zod'

export type Statut = 'pointe' | 'propose' | 'rejete'
export const STATUTS = ['pointe', 'propose', 'rejete'] as const satisfies readonly Statut[]

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalide : minuscules, chiffres et tirets uniquement')

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

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
  /** Le slug d’un chantier de la même discipline, ou rien. */
  chantier?: string
  /** Contenu fictif, écrit pour développer le site. Absent = contenu réel. */
  demonstration?: boolean
  cree: Date
  modifie: Date
}

export type Fiche = FicheMeta & { corps: string }

export const LONGUEUR_MAX_RESUME = 240

export type ChantierMeta = {
  slug: string
  nom: string
  discipline: string
  resume: string
  /** Contenu fictif, écrit pour développer le site. Absent = contenu réel. */
  demonstration?: boolean
  cree: Date
  modifie: Date
}

export type Chantier = ChantierMeta & { corps: string }

/**
 * Message lisible pour un échec de schéma, partagé par les fiches et les chantiers.
 * La valeur rejetée est reprise dans le message : sans elle, l'auteur sait quel
 * champ est fautif mais pas ce qu'il y a écrit, ce qui est l'information utile
 * quand on relit un front-matter de dix lignes.
 */
export function decrireErreursDeSchema(
  issues: { path: PropertyKey[]; message: string }[],
  champs: Record<string, unknown>,
): string {
  return issues
    .map((probleme) => {
      const champ = probleme.path.join('.') || '(racine)'
      const recu = probleme.path.length > 0 ? champs[String(probleme.path[0])] : undefined
      return recu === undefined
        ? `${champ} : ${probleme.message}`
        : `${champ} : ${probleme.message} (valeur reçue : ${JSON.stringify(recu)})`
    })
    .join(' ; ')
}

export function creerSchemaChantier(taxonomies: Taxonomies): ZodType<Omit<ChantierMeta, 'slug'>> {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]

  return z.strictObject({
    nom: z.string().min(1),
    discipline: z.enum(disciplines),
    // Même traitement que le résumé d'une fiche : les scalaires `>` du YAML
    // gardent un saut de ligne final, qui partirait tel quel dans la
    // méta-description et consommerait un caractère du budget pour rien.
    resume: z.string().trim().min(1).max(LONGUEUR_MAX_RESUME),
    // Absent vaut faux : le contenu réel n’a pas à se déclarer réel. On n’accepte
    // que `true`, pour qu’un `demonstration: false` oublié dans un fichier soit
    // refusé plutôt que de laisser croire à un marquage qui ne marque rien.
    demonstration: z.literal(true).optional(),
    cree: z.coerce.date(),
    modifie: z.coerce.date(),
  })
}

export function creerSchemaFiche(
  taxonomies: Taxonomies,
  chantiers: ChantierMeta[] = [],
): ZodType<Omit<FicheMeta, 'slug'>> {
  const disciplines = taxonomies.disciplines.map((d) => d.slug) as [string, ...string[]]
  const confusions = taxonomies.confusions.map((c) => c.slug) as [string, ...string[]]

  return z
    .strictObject({
      terme: z.string().min(1),
      discipline: z.enum(disciplines),
      confusion: z.enum(confusions),
      statut: z.enum(STATUTS),
      // Les scalaires `>` du YAML gardent un saut de ligne final, qui partirait
      // tel quel dans <meta name="description"> et consommerait un caractère
      // du budget de 240 pour rien.
      resume: z.string().trim().min(1).max(LONGUEUR_MAX_RESUME),
      suggestions: z.array(z.string().min(1)),
      // Pas un `z.enum` : l'appariement à vérifier porte sur deux champs à la
      // fois — le chantier doit exister ET relever de la même discipline — ce
      // qu'un enum sur le seul champ ne sait pas dire. Et `z.enum` exige une
      // liste non vide, impossible à garantir avec zéro chantier au corpus.
      chantier: z.string().min(1, 'chantier vide : retirer le champ plutôt que le laisser vide').optional(),
      // Absent vaut faux : le contenu réel n’a pas à se déclarer réel. On n’accepte
      // que `true`, pour qu’un `demonstration: false` oublié dans un fichier soit
      // refusé plutôt que de laisser croire à un marquage qui ne marque rien.
      demonstration: z.literal(true).optional(),
      cree: z.coerce.date(),
      modifie: z.coerce.date(),
    })
    .superRefine((fiche, ctx) => {
      if (fiche.chantier === undefined) return

      const chantier = chantiers.find((c) => c.slug === fiche.chantier)
      if (!chantier) {
        ctx.addIssue({
          code: 'custom',
          path: ['chantier'],
          message: `chantier inconnu « ${fiche.chantier} » — aucun fichier content/chantiers/${fiche.chantier}.md`,
        })
        return
      }

      if (chantier.discipline !== fiche.discipline) {
        ctx.addIssue({
          code: 'custom',
          path: ['chantier'],
          message: `le chantier « ${fiche.chantier} » relève de la discipline « ${chantier.discipline} », la fiche de « ${fiche.discipline} » — une fiche ne peut rejoindre qu’un chantier de sa propre discipline`,
        })
      }
    })
}

export type FicheIndex = Omit<FicheMeta, 'cree' | 'modifie'>

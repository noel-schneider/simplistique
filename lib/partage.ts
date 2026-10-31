import type { FicheMeta } from './content/schema'

/**
 * Textes de l’image de partage d’une fiche. L’accroche prime : c’est la phrase
 * pensée pour être lue seule ; à défaut, le résumé, qui est obligatoire.
 */
export function contenuImagePartage(
  fiche: FicheMeta,
  nomDiscipline: string,
): { titre: string; phrase: string; pied: string } {
  return {
    titre: fiche.terme,
    phrase: fiche.accroche ?? fiche.resume,
    pied: `Simplistique · ${nomDiscipline}`,
  }
}

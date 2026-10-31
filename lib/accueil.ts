import { PREUVES, type FicheIndex } from './content/schema'

export const NOMBRE_A_LA_UNE = 3

// Le rang vient de l’ordre de `PREUVES` (de la plus faible à la plus forte) :
// ajouter un niveau là-bas le place ici sans toucher à ce fichier.
function rang(preuve: FicheIndex['preuve']): number {
  return PREUVES.indexOf(preuve)
}

/**
 * Fiches mises à la une sur l’accueil. Déterministe, pour que deux builds du
 * même contenu donnent la même page : preuve la plus forte d’abord, puis terme
 * en ordre alphabétique français. Seules comptent les fiches qui ont une accroche.
 */
export function fichesALaUne(index: FicheIndex[], nombre: number = NOMBRE_A_LA_UNE): FicheIndex[] {
  return index
    .filter((fiche) => fiche.accroche !== undefined)
    .sort((a, b) => rang(b.preuve) - rang(a.preuve) || a.terme.localeCompare(b.terme, 'fr'))
    .slice(0, nombre)
}

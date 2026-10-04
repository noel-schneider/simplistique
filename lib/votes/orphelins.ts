export type LigneDeVote = { fiche: string; alternative: string | null; n: number }

/**
 * Une ligne est orpheline si sa fiche n’existe plus, ou si son alternative ne figure
 * plus parmi celles de la fiche. Un vote de fiche (`alternative` nulle) sur une fiche
 * existante n’est jamais orphelin.
 *
 * Cette fonction vit dans `lib/` et non dans le script qui l’emploie, parce qu’un
 * script a un effet de bord à l’import : le simple fait de l’importer pour tester
 * cette fonction lançait `principal()`, donc une requête contre la base dont l’URL
 * se trouvait dans l’environnement. Toute la suite de tests verrouille les accès à
 * la base derrière `DATABASE_URL_TEST` ; un test qui joint la production par la
 * porte de derrière ruinerait cette garantie.
 */
export function orphelines(
  lignes: LigneDeVote[],
  connues: Map<string, Set<string>>,
): LigneDeVote[] {
  return lignes.filter(({ fiche, alternative }) => {
    const empreintes = connues.get(fiche)
    if (!empreintes) return true
    return alternative !== null && !empreintes.has(alternative)
  })
}

/**
 * Insécables de la typographie française, posées à l'affichage seulement.
 *
 * Dans les sources, une espace insécable est invisible : elle survit mal à une
 * relecture et casse les recherches au clavier. Dans l'index de recherche,
 * elle empêcherait « 30 % » de correspondre à ce que le lecteur tape. On
 * garde donc des espaces ordinaires partout, et on ne convertit qu'au moment
 * de produire ce que le lecteur voit.
 *
 * Seule une espace ordinaire isolée est convertie : une espace déjà
 * insécable (idempotence) ou une suite d'espaces (mise en forme voulue) reste
 * telle quelle.
 */
const FINE_INSECABLE = ' '
const INSECABLE = ' '

export function typographier(texte: string): string {
  return texte
    .replace(/(?<! ) (?=[;!?%»])/g, FINE_INSECABLE)
    .replace(/(?<=«) (?! )/g, FINE_INSECABLE)
    .replace(/(?<! ) (?=:)/g, INSECABLE)
}

/**
 * Découpe le texte d’une migration en instructions SQL séparées par `;`.
 *
 * Le pilote HTTP de Neon (`sql.query`) n’accepte qu’une seule instruction par
 * requête : sessions et transactions n’existent pas pour lui en dehors de
 * `sql.transaction()`, qui attend justement un tableau de requêtes
 * individuelles. Envoyer le fichier de migration entier, avec ses trois
 * instructions séparées par des `;`, échouerait en production avec l’erreur
 * Postgres 42601 (« cannot insert multiple commands into a prepared
 * statement »). Un test qui appliquerait la migration via `pg.Client`, dont
 * le protocole simple accepte le multi-instructions, ne révélerait jamais ce
 * problème : la migration « marcherait » dans les tests et jamais en vrai.
 * Ce découpage permet d’appliquer les instructions une par une, par le même
 * chemin en test et en production.
 *
 * Le découpage est naïf : il coupe sur chaque `;`, sans tenir compte des
 * chaînes littérales ni des corps de fonction. Il suffit à ce fichier de
 * migration, dont aucune instruction ne contient de `;` ailleurs qu’à sa fin.
 * Une migration future qui en contiendrait un à l’intérieur d’une chaîne ou
 * d’un `$$ ... $$` serait coupée en fragments invalides : il faudra alors un
 * vrai analyseur, ou un fichier par instruction.
 */
export const CHEMIN_MIGRATION = 'migrations/001-votes.sql'

function estSeulementCommentaires(instruction: string): boolean {
  return instruction
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0)
    .every((ligne) => ligne.startsWith('--'))
}

export function instructionsSql(texte: string): string[] {
  return texte
    .split(';')
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0 && !estSeulementCommentaires(morceau))
}

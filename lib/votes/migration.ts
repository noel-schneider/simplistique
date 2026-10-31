import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Découpe le texte d’une migration en instructions SQL séparées par `;`.
 *
 * Le pilote HTTP de Neon (`sql.query`) n’accepte qu’une seule instruction par
 * requête : sessions et transactions n’existent pas pour lui en dehors de
 * `sql.transaction()`, qui attend justement un tableau de requêtes
 * individuelles. Envoyer un fichier de migration entier, avec ses instructions
 * séparées par des `;`, échouerait en production avec l’erreur Postgres 42601
 * (« cannot insert multiple commands into a prepared statement »). Un test qui
 * appliquerait la migration via `pg.Client`, dont le protocole simple accepte
 * le multi-instructions, ne révélerait jamais ce problème : la migration
 * « marcherait » dans les tests et jamais en vrai. Ce découpage permet
 * d’appliquer les instructions une par une, par le même chemin en test et en
 * production.
 *
 * Le découpage est naïf : il coupe sur chaque `;`, sans tenir compte des
 * chaînes littérales ni des corps de fonction. Il suffit aux fichiers actuels
 * de `migrations/`, dont aucune instruction ne contient de `;` ailleurs qu’à sa
 * fin — commentaires compris, puisqu’un `--` ne protège pas son contenu du
 * découpage. **Cette règle vaut pour chaque nouveau fichier** : une migration
 * future qui contiendrait un `;` à l’intérieur d’une chaîne, d’un commentaire
 * ou d’un `$$ ... $$` serait coupée en fragments invalides, et c’est toute la
 * transaction qui échouerait. Il faudra alors un vrai analyseur, ou un fichier
 * par instruction.
 */
export const DOSSIER_MIGRATIONS = 'migrations'

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

/**
 * Les fichiers `*.sql` du dossier, dans l’ordre des chaînes : c’est le préfixe
 * numéroté (`001-`, `002-`…) qui fixe l’ordre d’application, d’où les zéros de
 * tête — sans eux, `10-` passerait avant `2-`. Le tri est explicite : l’ordre que
 * rend `readdirSync` dépend du système de fichiers.
 */
export function fichiersDeMigration(dossier: string = join(process.cwd(), DOSSIER_MIGRATIONS)): string[] {
  return readdirSync(dossier)
    .filter((nom) => nom.endsWith('.sql'))
    .sort()
}

/**
 * Toutes les instructions de toutes les migrations, à la suite. Aucune table de
 * suivi ne retient ce qui a déjà été appliqué : chaque lancement rejoue tout, ce
 * qui n’est sûr que parce que chaque instruction est idempotente (`IF NOT EXISTS`).
 */
export function instructionsDeToutesLesMigrations(
  dossier: string = join(process.cwd(), DOSSIER_MIGRATIONS),
): string[] {
  return fichiersDeMigration(dossier).flatMap((nom) =>
    instructionsSql(readFileSync(join(dossier, nom), 'utf8')),
  )
}

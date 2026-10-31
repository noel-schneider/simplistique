/**
 * Caractères de contrôle C0 (sauf `\t` et `\n`), DEL et C1. La validation de
 * `/api/propositions` les refuse déjà ; ce filet couvre une ligne écrite avant
 * cette règle, ou à la main en base, qui pourrait sinon envoyer au terminal du
 * modérateur une séquence ANSI (effacer l’écran, déguiser une autre ligne).
 */
const CONTROLES = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/gu

/** Remplace chaque caractère de contrôle par son code visible, `\u{1b}` par exemple. */
export function neutraliserControles(texte: string): string {
  return texte.replace(CONTROLES, (c) => `\\u{${c.codePointAt(0)!.toString(16)}}`)
}

/**
 * Lit l’identifiant passé à `--traiter`. `Number()` accepterait « 1e2 », « 0x10 »
 * ou « 5 » entouré d’espaces et viserait une autre proposition que celle
 * tapée : seule une suite de chiffres sans zéro initial est acceptée.
 */
export function lireIdentifiant(texte: string | undefined): number | null {
  if (texte === undefined || !/^[1-9][0-9]*$/.test(texte)) return null
  const id = Number(texte)
  return Number.isSafeInteger(id) ? id : null
}

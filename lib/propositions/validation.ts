export type Proposition = {
  terme: string
  discipline: string
  pourquoi: string
  suggestion: string
}

type Champ = keyof Proposition

/**
 * Bornes en caractères, après `trim`. Le minimum de `pourquoi` écarte le « nul »
 * ou le « ? » qui ne donnerait rien à instruire ; les maximums bornent ce qu’un
 * seul envoi peut écrire en base. Table exhaustive : un champ ajouté au type sans
 * limite ne compile pas. L’ordre des clés est celui des `champs` rendus en erreur.
 */
const BORNES: Record<Champ, { requis: boolean; min: number; max: number }> = {
  terme: { requis: true, min: 1, max: 120 },
  discipline: { requis: false, min: 0, max: 80 },
  pourquoi: { requis: true, min: 20, max: 2000 },
  suggestion: { requis: false, min: 0, max: 200 },
}

const CHAMPS = Object.keys(BORNES) as Champ[]

/**
 * C0 sauf `\t` et `\n`, DEL et C1. Rien de ce qu’on tape dans un formulaire n’en
 * produit ; en base, ils ne serviraient qu’à piéger le terminal du modérateur
 * (séquences ANSI) ou à tronquer un affichage (NUL). `\r` seul en fait partie ;
 * `\r\n`, que certains navigateurs envoient pour un saut de ligne, est ramené à
 * `\n` avant le contrôle.
 */
const CONTROLE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u

// Par points de code et non par unités UTF-16 : un emoji compte pour un caractère,
// comme le voit le visiteur.
function longueur(texte: string): number {
  return Array.from(texte).length
}

/**
 * Le champ `site` est invisible pour un humain (masqué par la page) : seul un robot
 * qui remplit tout le remplit. Il est examiné avant tout le reste, pour qu’un robot
 * n’apprenne jamais, par une réponse 400, ce qu’il aurait dû corriger.
 */
function estUnPiege(valeur: unknown): boolean {
  if (valeur === undefined || valeur === null) return false
  return typeof valeur !== 'string' || valeur.trim().length > 0
}

export function validerProposition(
  corps: unknown,
):
  | { ok: true; proposition: Proposition }
  | { ok: false; erreur: 'invalide'; champs: string[] }
  | { ok: true; piege: true } {
  const objet =
    typeof corps === 'object' && corps !== null && !Array.isArray(corps)
      ? (corps as Record<string, unknown>)
      : {}
  if (estUnPiege(objet.site)) return { ok: true, piege: true }

  const proposition = {} as Proposition
  const champs: string[] = []
  // Seules les clés connues sont lues : une clé inconnue (`auteur`, `id`…) ne peut
  // rien injecter, et l’ignorer laisse la page évoluer sans casser l’API.
  for (const champ of CHAMPS) {
    const brute = objet[champ] ?? ''
    if (typeof brute !== 'string') {
      champs.push(champ)
      continue
    }
    const valeur = brute.replaceAll('\r\n', '\n').trim()
    const { requis, min, max } = BORNES[champ]
    const n = longueur(valeur)
    if ((requis && n === 0) || (n > 0 && n < min) || n > max || CONTROLE.test(valeur)) champs.push(champ)
    proposition[champ] = valeur
  }

  if (champs.length > 0) return { ok: false, erreur: 'invalide', champs }
  return { ok: true, proposition }
}

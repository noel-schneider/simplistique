import type { Element, Root, RootContent } from 'hast'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { typographier } from '../typographie'

const CROCHETS = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function retirerCrochets(texte: string): string {
  return texte.replace(CROCHETS, (_, cible: string, affiche?: string) => (affiche ?? cible).trim())
}

// Le projet attend des fiches par pull request de personnes extérieures :
// une image distante enverrait l'adresse IP et le navigateur de chaque
// lecteur à un tiers, pour un contenu que l'auteur peut changer après la
// fusion sans repasser par une relecture. Aucune fiche n'emploie d'image
// aujourd'hui et la spec n'en parle pas : le plus simple et le plus lisible
// est de retirer `img` des balises autorisées plutôt que de n'autoriser que
// les `src` relatifs.
const schemaSansImagesDistantes = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter((nom) => nom !== 'img'),
}

// Les insécables se posent sur le HTML produit, après la sanitisation, et après `rehypeSlug` pour que les ancres
// restent calculées sur des espaces ordinaires : ni
// le texte source ni l'index de recherche ne les voient. Le code est exclu,
// où une espace est une espace (commande, chemin, exemple de syntaxe).
function typographierLesTextes(noeud: Root | Element): void {
  for (const enfant of noeud.children as RootContent[]) {
    if (enfant.type === 'text') enfant.value = typographier(enfant.value)
    else if (enfant.type === 'element' && enfant.tagName !== 'code' && enfant.tagName !== 'pre') {
      typographierLesTextes(enfant)
    }
  }
}

function rehypeTypographie() {
  return (arbre: Root) => typographierLesTextes(arbre)
}

const processeur = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schemaSansImagesDistantes)
  .use(rehypeSlug)
  .use(rehypeTypographie)
  .use(rehypeStringify)

export async function rendreMarkdown(markdown: string): Promise<string> {
  const fichier = await processeur.process(retirerCrochets(markdown))
  return String(fichier)
}

export function listerTitres(markdown: string): string[] {
  const titres: string[] = []
  let dansUnBlocDeCode = false

  for (const ligne of markdown.split('\n')) {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBlocDeCode = !dansUnBlocDeCode
      continue
    }
    if (dansUnBlocDeCode) continue

    const correspondance = /^##\s+(.*\S)\s*$/.exec(ligne)
    if (correspondance) titres.push(retirerCrochets(correspondance[1]))
  }

  return titres
}

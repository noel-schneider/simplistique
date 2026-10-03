import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const CROCHETS = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function retirerCrochets(texte: string): string {
  return texte.replace(CROCHETS, (_, cible: string, affiche?: string) => (affiche ?? cible).trim())
}

const processeur = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeSlug)
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

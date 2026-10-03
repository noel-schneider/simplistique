import { describe, expect, it } from 'vitest'
import { listerTitres, rendreMarkdown, retirerCrochets } from './markdown'

describe('retirerCrochets', () => {
  it('retire les crochets doubles en gardant le mot', () => {
    expect(retirerCrochets('un frein à la [[clarté]] du propos')).toBe('un frein à la clarté du propos')
  })

  it('garde la partie affichée d\'un lien à barre verticale', () => {
    expect(retirerCrochets('pas très [[Intuitivité|intuitif]]')).toBe('pas très intuitif')
  })

  it('laisse intact un texte sans crochets', () => {
    expect(retirerCrochets('rien à signaler')).toBe('rien à signaler')
  })
})

describe('rendreMarkdown', () => {
  it('rend les titres avec un identifiant ancrable', async () => {
    const html = await rendreMarkdown('## Pourquoi c\'est confus')
    expect(html).toMatch(/<h2 id="[^"]+">/)
    expect(html).toMatch(/Pourquoi c.{1,8}est confus/)
  })

  it('ne laisse aucun crochet double dans le HTML', async () => {
    const html = await rendreMarkdown('Un frein à la [[clarté]].')
    expect(html).not.toContain('[[')
    expect(html).toContain('clarté')
  })

  it('échappe le HTML brut présent dans la source', async () => {
    const html = await rendreMarkdown('Attention <script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })

  it('rend les listes et l\'emphase', async () => {
    const html = await rendreMarkdown('- un *mot*\n- deux')
    expect(html).toContain('<li>')
    expect(html).toContain('<em>mot</em>')
  })
})

describe('listerTitres', () => {
  it('liste les titres de niveau 2 dans l\'ordre', () => {
    const md = '# Titre\n\n## Pourquoi c\'est confus\n\ntexte\n\n## Risques\n\ntexte'
    expect(listerTitres(md)).toEqual(["Pourquoi c'est confus", 'Risques'])
  })

  it('ignore un ## à l\'intérieur d\'un bloc de code', () => {
    const md = '## Vrai titre\n\n```\n## faux titre\n```\n'
    expect(listerTitres(md)).toEqual(['Vrai titre'])
  })

  it('rend une liste vide quand il n\'y a aucun titre', () => {
    expect(listerTitres('juste du texte')).toEqual([])
  })
})

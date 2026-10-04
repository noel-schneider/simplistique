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

  // Comportement figé, pas documenté ni voulu : les crochets imbriqués ne
  // sont pas pris en charge. La regex s'arrête à la première occurrence de
  // « ] » ou « | », donc le « [[ » intérieur survit tel quel dans le
  // résultat — c'est l'avertissement de `lint:content` sur un « [[ »
  // résiduel (voir scripts/coherence.ts) qui sert de filet pour ce cas.
  it('ne prend pas en charge les crochets imbriqués : le « [[ » intérieur survit', () => {
    expect(retirerCrochets('[[a [[b]] c]]')).toBe('a [[b c]]')
  })

  // Comportement figé : plusieurs barres verticales dans un même crochet
  // gardent tout ce qui suit la première barre, y compris les barres
  // suivantes — c'est le comportement d'Obsidian pour un lien à affichage
  // personnalisé, donc intentionnel.
  it('garde tout ce qui suit la première barre quand il y en a plusieurs', () => {
    expect(retirerCrochets('[[a|b|c]]')).toBe('b|c')
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

  it('retire un lien dont le protocole est exécutable', async () => {
    const html = await rendreMarkdown('[clic](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('clic')
  })

  it('retire une image dont le protocole est exécutable', async () => {
    const html = await rendreMarkdown('![x](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('retire une image distante', async () => {
    const html = await rendreMarkdown('![x](https://evil.example/pixel.png)')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('evil.example')
  })

  it('conserve un lien http légitime', async () => {
    const html = await rendreMarkdown('[le dépôt](https://example.org/a)')
    expect(html).toContain('href="https://example.org/a"')
  })

  it('rend les listes et l\'emphase', async () => {
    const html = await rendreMarkdown('- un *mot*\n- deux')
    expect(html).toContain('<li>')
    expect(html).toContain('<em>mot</em>')
  })

  it('rend un tableau markdown avec ses cellules', async () => {
    const html = await rendreMarkdown('| a | b |\n| --- | --- |\n| un | deux |\n')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>un</td>')
  })

  it('rend le texte barré', async () => {
    const html = await rendreMarkdown('~~barré~~')
    expect(html).toContain('<del>barré</del>')
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

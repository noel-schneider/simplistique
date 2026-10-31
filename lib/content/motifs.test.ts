import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getMotif, getMotifs } from './motifs'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

const TAXONOMIES = chargerTaxonomies(DOSSIER_CONTENU)

let dossier: string

beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'simplistique-motifs-'))
  mkdirSync(join(dossier, 'motifs'), { recursive: true })
})

afterEach(() => {
  rmSync(dossier, { recursive: true, force: true })
})

function ecrire(fichier: string, contenu: string): void {
  writeFileSync(join(dossier, 'motifs', fichier), contenu, 'utf8')
}

const VALIDE = `---
nom: Positif et négatif
resume: Deux adjectifs lus comme des jugements de valeur alors qu’ils comptent.
cree: 2026-10-31
modifie: 2026-10-31
---

## Le piège

Le texte.
`

describe('getMotifs', () => {
  it('rend une liste vide quand le dossier n’existe pas', () => {
    expect(getMotifs(join(dossier, 'vide'), TAXONOMIES)).toEqual([])
  })

  it('lit un motif et prend son slug dans le nom de fichier', () => {
    ecrire('positif-et-negatif.md', VALIDE)
    const motifs = getMotifs(dossier, TAXONOMIES)
    expect(motifs).toHaveLength(1)
    expect(motifs[0].slug).toBe('positif-et-negatif')
    expect(motifs[0].nom).toBe('Positif et négatif')
    expect(motifs[0].corps).toContain('## Le piège')
  })

  it('trie par nom, en français', () => {
    // Noms de fichiers dans l’ordre inverse du résultat attendu : sans le tri,
    // `readdirSync` rendrait « Les taux » avant « Épreuves ».
    ecrire('a-taux.md', VALIDE.replace('Positif et négatif', 'Les taux'))
    ecrire('z-epreuves.md', VALIDE.replace('Positif et négatif', 'Épreuves'))
    expect(getMotifs(dossier, TAXONOMIES).map((m) => m.nom)).toEqual(['Épreuves', 'Les taux'])
  })

  it('refuse un nom de fichier qui n’est pas un slug', () => {
    ecrire('Positif Et Négatif.md', VALIDE)
    expect(() => getMotifs(dossier, TAXONOMIES)).toThrow(/Positif Et Négatif\.md/)
  })

  it('refuse un motif au front-matter invalide', () => {
    ecrire('x.md', VALIDE.replace('nom: Positif et négatif\n', ''))
    expect(() => getMotifs(dossier, TAXONOMIES)).toThrow(/x\.md.*nom/)
  })

  it('refuse une clé de front-matter inconnue plutôt que de l’ignorer', () => {
    ecrire('x.md', VALIDE.replace('nom:', 'discipline: droit\nnom:'))
    expect(() => getMotifs(dossier, TAXONOMIES)).toThrow(/discipline/)
  })

  it('refuse un résumé plus long que la limite', () => {
    ecrire('x.md', VALIDE.replace(/resume: .*/, `resume: ${'a'.repeat(241)}`))
    expect(() => getMotifs(dossier, TAXONOMIES)).toThrow(/resume/)
  })
})

describe('getMotifs sur le corpus réel', () => {
  it('lit les trois motifs du dépôt, chacun une seule fois', () => {
    const motifs = getMotifs(DOSSIER_CONTENU, TAXONOMIES)
    expect(motifs.map((m) => m.slug).sort()).toEqual([
      'normal-et-naturel',
      'positif-et-negatif',
      'taux-et-niveau',
    ])
  })
})

describe('getMotif', () => {
  it('rend null pour un slug inconnu', () => {
    expect(getMotif('absent', dossier, TAXONOMIES)).toBeNull()
  })

  it('rend le motif demandé', () => {
    ecrire('positif-et-negatif.md', VALIDE)
    expect(getMotif('positif-et-negatif', dossier, TAXONOMIES)?.nom).toBe('Positif et négatif')
  })
})

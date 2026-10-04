import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getChantier, getChantiers } from './chantiers'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'

const TAXONOMIES = chargerTaxonomies(DOSSIER_CONTENU)

let dossier: string

beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'simplistique-chantiers-'))
  mkdirSync(join(dossier, 'chantiers'), { recursive: true })
})

afterEach(() => {
  rmSync(dossier, { recursive: true, force: true })
})

function ecrire(fichier: string, contenu: string): void {
  writeFileSync(join(dossier, 'chantiers', fichier), contenu, 'utf8')
}

const VALIDE = `---
nom: Le vocabulaire du bilan
discipline: comptabilite
resume: Deux colonnes qui n’opposent rien de clair.
cree: 2026-10-04
modifie: 2026-10-04
---

## Risques

Le texte.
`

describe('getChantiers', () => {
  it("rend une liste vide quand le dossier n’existe pas", () => {
    expect(getChantiers(join(dossier, 'vide'), TAXONOMIES)).toEqual([])
  })

  it("lit un chantier et prend son slug dans le nom de fichier", () => {
    ecrire('vocabulaire-du-bilan.md', VALIDE)
    const chantiers = getChantiers(dossier, TAXONOMIES)
    expect(chantiers).toHaveLength(1)
    expect(chantiers[0].slug).toBe('vocabulaire-du-bilan')
    expect(chantiers[0].nom).toBe('Le vocabulaire du bilan')
    expect(chantiers[0].discipline).toBe('comptabilite')
    expect(chantiers[0].corps).toContain('## Risques')
  })

  it("trie par nom, en français", () => {
    // Les noms de fichiers sont dans l'ordre inverse du résultat attendu : si le
    // tri disparaissait, `readdirSync` rendrait `a-…` avant `z-…`, donc « Les
    // structures » avant « Épreuves », et ce test tomberait. Avec des noms dont
    // l'ordre coïncide avec celui des titres, il ne mesurerait que l'ordre du
    // système de fichiers.
    ecrire('a-structures.md', VALIDE.replace('Le vocabulaire du bilan', 'Les structures'))
    ecrire('z-epreuves.md', VALIDE.replace('Le vocabulaire du bilan', 'Épreuves'))
    expect(getChantiers(dossier, TAXONOMIES).map((c) => c.nom)).toEqual([
      'Épreuves',
      'Les structures',
    ])
  })

  // Review Focus nº 1 : un nom de fichier invalide doit nommer le fichier fautif.
  it("refuse un nom de fichier qui n’est pas un slug", () => {
    ecrire('Vocabulaire Du Bilan.md', VALIDE)
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/Vocabulaire Du Bilan\.md/)
  })

  it("refuse une discipline inconnue", () => {
    ecrire('x.md', VALIDE.replace("comptabilite", "alchimie"))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/discipline/)
  })

  it("nomme la valeur rejetée dans le message d'erreur", () => {
    ecrire('x.md', VALIDE.replace("comptabilite", "alchimie"))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/alchimie/)
  })

  it("refuse un résumé plus long que la limite", () => {
    ecrire('x.md', VALIDE.replace("Deux colonnes qui n’opposent rien de clair.", 'a'.repeat(241)))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/resume/)
  })

  it("refuse une date de modification antérieure à la création", () => {
    ecrire('x.md', VALIDE.replace("modifie: 2026-10-04", "modifie: 2026-10-01"))
    expect(() => getChantiers(dossier, TAXONOMIES)).toThrow(/modifie/)
  })
})

describe('getChantiers sur le corpus réel', () => {
  it('lit tous les chantiers du dépôt, et chacun une seule fois', () => {
    const chantiers = getChantiers(DOSSIER_CONTENU, TAXONOMIES)
    expect(chantiers).toHaveLength(1)
    expect(new Set(chantiers.map((c) => c.slug)).size).toBe(chantiers.length)
  })
})

describe('getChantier', () => {
  it("rend null pour un slug inconnu", () => {
    expect(getChantier('absent', dossier, TAXONOMIES)).toBeNull()
  })

  it("rend le chantier demandé", () => {
    ecrire('vocabulaire-du-bilan.md', VALIDE)
    expect(getChantier('vocabulaire-du-bilan', dossier, TAXONOMIES)?.nom).toBe(
      'Le vocabulaire du bilan',
    )
  })
})

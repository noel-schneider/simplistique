import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Fiche } from '../content/schema'
import { depotEnMemoire, type DepotDeVotes } from './depot'
import { empreinteAlternative } from './empreintes'
import { annuler, cibleValide, empreintesDeLaFiche, lire, LIMITE_PAR_HEURE, voter } from './service'

const ALICE = 'a'.repeat(64)
const BOB = 'b'.repeat(64)

function fiche(suggestions: string[] = ['avoir', 'ressources']): Fiche {
  return {
    slug: 'actif-comptabilite',
    terme: 'actif',
    discipline: 'comptabilite',
    confusion: 'faux-ami-courant',
    statut: suggestions.length ? 'propose' : 'pointe',
    resume: 'court',
    suggestions,
    cree: new Date('2026-10-03'),
    modifie: new Date('2026-10-03'),
    corps: '## Risques\n\ntexte\n',
  }
}

const AVOIR = empreinteAlternative('avoir')
const RESSOURCES = empreinteAlternative('ressources')
const INCONNUE = 'f'.repeat(16)

describe('empreintesDeLaFiche', () => {
  it('rend une empreinte par alternative', () => {
    expect(empreintesDeLaFiche(fiche())).toEqual([AVOIR, RESSOURCES])
  })

  it('rend une liste vide pour une fiche sans alternative', () => {
    expect(empreintesDeLaFiche(fiche([]))).toEqual([])
  })
})

describe('cibleValide', () => {
  it('accepte un vote de fiche', () => {
    expect(cibleValide({ fiche: 'actif-comptabilite', alternative: null }, fiche())).toBe(true)
  })

  it('accepte une alternative de cette fiche', () => {
    expect(cibleValide({ fiche: 'actif-comptabilite', alternative: AVOIR }, fiche())).toBe(true)
  })

  it('refuse une fiche absente du corpus', () => {
    expect(cibleValide({ fiche: 'licorne', alternative: null }, null)).toBe(false)
  })

  it('refuse une empreinte qui n’est pas une alternative de cette fiche', () => {
    expect(cibleValide({ fiche: 'actif-comptabilite', alternative: INCONNUE }, fiche())).toBe(false)
  })

  it('refuse une alternative sur une fiche qui n’en a aucune', () => {
    expect(cibleValide({ fiche: 'actif-comptabilite', alternative: AVOIR }, fiche([]))).toBe(false)
  })

  it('refuse un slug qui ne correspond pas à la fiche fournie', () => {
    expect(cibleValide({ fiche: 'autre-chose', alternative: null }, fiche())).toBe(false)
  })
})

describe('voter', () => {
  let depot: DepotDeVotes
  beforeEach(() => {
    depot = depotEnMemoire()
  })

  it('enregistre un vote de fiche et rend les compteurs à jour', async () => {
    const issue = await voter(depot, { fiche: 'actif-comptabilite', alternative: null }, fiche(), ALICE)
    expect(issue).toEqual({
      type: 'ok',
      comptes: { fiche: 1, alternatives: {} },
      miens: { fiche: true, alternatives: [] },
    })
  })

  it('enregistre un vote d’alternative', async () => {
    const issue = await voter(depot, { fiche: 'actif-comptabilite', alternative: AVOIR }, fiche(), ALICE)
    expect(issue.type).toBe('ok')
    if (issue.type !== 'ok') return
    expect(issue.comptes.alternatives[AVOIR]).toBe(1)
    expect(issue.miens.alternatives).toEqual([AVOIR])
  })

  it('refuse une cible qui n’existe pas dans le corpus', async () => {
    expect(await voter(depot, { fiche: 'licorne', alternative: null }, null, ALICE)).toEqual({
      type: 'inconnu',
    })
    expect(
      await voter(depot, { fiche: 'actif-comptabilite', alternative: INCONNUE }, fiche(), ALICE),
    ).toEqual({ type: 'inconnu' })
    expect(await depot.compter('licorne')).toEqual({ fiche: 0, alternatives: {} })
  })

  it('refuse un second vote identique', async () => {
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    await voter(depot, cible, fiche(), ALICE)
    expect(await voter(depot, cible, fiche(), ALICE)).toEqual({ type: 'deja' })
  })

  it('n’écrit rien quand la cible est invalide', async () => {
    await voter(depot, { fiche: 'actif-comptabilite', alternative: INCONNUE }, fiche(), ALICE)
    expect(await depot.compter('actif-comptabilite')).toEqual({ fiche: 0, alternatives: {} })
  })

  it('refuse au-delà de la limite horaire, et n’écrit pas le vote refusé', async () => {
    for (let i = 0; i < LIMITE_PAR_HEURE; i += 1) {
      await depot.ajouter({ fiche: `remplissage-${i}`, alternative: null }, ALICE)
    }
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    expect(await voter(depot, cible, fiche(), ALICE)).toEqual({ type: 'trop' })
    expect((await depot.compter('actif-comptabilite')).fiche).toBe(0)
  })

  it('ne compte pas dans la limite les votes vieux de plus d’une heure', async () => {
    // Sans ce test, une fenêtre fausse — `60 * 1000` au lieu de `60 * 60 * 1000`, ou
    // l'inverse — passerait inaperçue : tous les autres tests de limite posent leurs
    // votes à l'instant présent, donc aucun n'exerce l'expiration.
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-03T10:00:00Z'))
      for (let i = 0; i < LIMITE_PAR_HEURE; i += 1) {
        await depot.ajouter({ fiche: `remplissage-${i}`, alternative: null }, ALICE)
      }

      vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
      const cible = { fiche: 'actif-comptabilite', alternative: null }
      expect((await voter(depot, cible, fiche(), ALICE)).type).toBe('ok')
    } finally {
      vi.useRealTimers()
    }
  })

  it('compte dans la limite un vote posé il y a moins d’une heure', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-03T11:30:00Z'))
      for (let i = 0; i < LIMITE_PAR_HEURE; i += 1) {
        await depot.ajouter({ fiche: `remplissage-${i}`, alternative: null }, ALICE)
      }

      vi.setSystemTime(new Date('2026-10-03T12:00:00Z'))
      const cible = { fiche: 'actif-comptabilite', alternative: null }
      expect(await voter(depot, cible, fiche(), ALICE)).toEqual({ type: 'trop' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('la limite est par votant, pas globale', async () => {
    for (let i = 0; i < LIMITE_PAR_HEURE; i += 1) {
      await depot.ajouter({ fiche: `remplissage-${i}`, alternative: null }, ALICE)
    }
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    expect((await voter(depot, cible, fiche(), BOB)).type).toBe('ok')
  })
})

describe('annuler', () => {
  let depot: DepotDeVotes
  beforeEach(() => {
    depot = depotEnMemoire()
  })

  it('retire son propre vote', async () => {
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    await voter(depot, cible, fiche(), ALICE)
    const issue = await annuler(depot, cible, fiche(), ALICE)
    expect(issue).toEqual({
      type: 'ok',
      comptes: { fiche: 0, alternatives: {} },
      miens: { fiche: false, alternatives: [] },
    })
  })

  it('annuler un vote qu’on n’a pas émis rend « absent »', async () => {
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    expect(await annuler(depot, cible, fiche(), ALICE)).toEqual({ type: 'absent' })
  })

  it('n’est pas soumis à la limite de débit', async () => {
    const cible = { fiche: 'actif-comptabilite', alternative: null }
    await voter(depot, cible, fiche(), ALICE)
    for (let i = 0; i < LIMITE_PAR_HEURE; i += 1) {
      await depot.ajouter({ fiche: `remplissage-${i}`, alternative: null }, ALICE)
    }
    expect((await annuler(depot, cible, fiche(), ALICE)).type).toBe('ok')
  })
})

describe('lire', () => {
  it('rend les compteurs et ce que ce visiteur a voté', async () => {
    const depot = depotEnMemoire()
    await voter(depot, { fiche: 'actif-comptabilite', alternative: AVOIR }, fiche(), ALICE)
    await voter(depot, { fiche: 'actif-comptabilite', alternative: AVOIR }, fiche(), BOB)
    await voter(depot, { fiche: 'actif-comptabilite', alternative: null }, fiche(), BOB)

    expect(await lire(depot, fiche(), ALICE)).toEqual({
      type: 'ok',
      comptes: { fiche: 1, alternatives: { [AVOIR]: 2 } },
      miens: { fiche: false, alternatives: [AVOIR] },
    })
  })
})

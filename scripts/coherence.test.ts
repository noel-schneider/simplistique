import { describe, expect, it } from 'vitest'
import type { Chantier, Fiche, Motif, Source } from '../lib/content/schema'
import { verifierChantiers, verifierCoherence, verifierMotifs, verifierCorpus, verifierDocuments } from './coherence'
import { getFiches } from '../lib/content/fiches'
import { getMotifs } from '../lib/content/motifs'
import { DOSSIER_CONTENU } from '../lib/content/taxonomies'

function fiche(p: Partial<Fiche> = {}): Fiche {
  return {
    slug: 'groupe-mathematiques',
    terme: 'groupe',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    preuve: 'intuition',
    sources: [],
    precedents: [],
    motifs: [],
    resume: 'court',
    suggestions: [],
    cree: new Date('2026-10-03'),
    modifie: new Date('2026-10-03'),
    corps: '## Pourquoi c\'est confus\n\ntexte\n\n## Risques\n\ntexte\n',
    ...p,
  }
}

describe('preuve et sources', () => {
  const source = (p: Partial<Source> = {}): Source => ({
    auteur: 'Okun',
    annee: 1989,
    titre: 'Le mot « relativité »',
    lecture: 'originale',
    ...p,
  })

  it('avertit si preuve documentee ou mesuree sans source', () => {
    for (const preuve of ['documentee', 'mesuree'] as const) {
      const a = verifierCoherence(fiche({ preuve, sources: [] }))
      expect(a.map((x) => x.message).join()).toMatch(/source/)
    }
  })

  it('liste chaque source lue de seconde main', () => {
    const a = verifierCoherence(
      fiche({
        preuve: 'documentee',
        sources: [
          source({ auteur: 'Sidman', annee: 2006, lecture: 'seconde-main' }),
          source({ auteur: 'Carroll', annee: 2003, lecture: 'seconde-main' }),
          source({ auteur: 'Okun', annee: 1989 }),
        ],
      }),
    )
    expect(a).toHaveLength(2)
    expect(a[0].message).toMatch(/Sidman.*2006/)
    expect(a[1].message).toMatch(/Carroll.*2003/)
  })

  it('n’avertit pas une intuition sans source', () => {
    expect(verifierCoherence(fiche({ preuve: 'intuition', sources: [] }))).toEqual([])
  })
})

describe('verifierCoherence', () => {
  it('ne signale rien sur une fiche saine', () => {
    expect(verifierCoherence(fiche())).toEqual([])
  })

  it('signale l\'absence de section Risques', () => {
    const a = verifierCoherence(fiche({ corps: '## Pourquoi c\'est confus\n\ntexte\n' }))
    expect(a).toHaveLength(1)
    expect(a[0]).toEqual({ slug: 'groupe-mathematiques', message: expect.stringMatching(/risques/) })
  })

  it('accepte un titre de section plus long que « Risques »', () => {
    expect(verifierCoherence(fiche({ corps: '## Risques et limites\n\ntexte\n' }))).toEqual([])
    expect(verifierCoherence(fiche({ corps: '## Les risques du changement\n\ntexte\n' }))).toEqual([])
  })

  it('accepte le titre quelle que soit la casse', () => {
    expect(verifierCoherence(fiche({ corps: '## RISQUES\n\ntexte\n' }))).toEqual([])
  })

  it('signale un statut pointe accompagné de suggestions', () => {
    const a = verifierCoherence(fiche({ statut: 'pointe', suggestions: ['truc'] }))
    expect(a.map((x) => x.message).join()).toMatch(/pointe/)
  })

  it('signale un statut propose sans aucune suggestion', () => {
    const a = verifierCoherence(fiche({ statut: 'propose', suggestions: [] }))
    expect(a.map((x) => x.message).join()).toMatch(/propose/)
  })

  it('accepte un statut rejete avec ou sans suggestions', () => {
    expect(verifierCoherence(fiche({ statut: 'rejete', suggestions: [] }))).toEqual([])
    expect(verifierCoherence(fiche({ statut: 'rejete', suggestions: ['truc'] }))).toEqual([])
  })

  it('signale un resume proche de la limite', () => {
    const a = verifierCoherence(fiche({ resume: 'a'.repeat(230) }))
    expect(a.map((x) => x.message).join()).toMatch(/resume/)
  })

  it('signale des crochets doubles qui survivent à l\'aplatissement, en situant le passage', () => {
    const a = verifierCoherence(fiche({ corps: '## Risques\n\nun [[crochet non ferme\n' }))
    expect(a).toHaveLength(1)
    expect(a[0].message).toMatch(/crochets doubles/)
    expect(a[0].message).toContain('[[crochet non ferme')
  })

  it('ne coupe pas un caractère accentué décomposé tombant à la frontière des 40 caractères', () => {
    // « e » + accent aigu combinant (U+0301) : deux points de code pour un
    // seul graphème. Construit pour que l'ancien découpage par index de
    // code unité tranche juste entre les deux — avant le graphème complet,
    // donc avant que l'accent ne soit inclus.
    const accentDecompose = 'é'
    const remplissage = 'x'.repeat(37)
    const corps = `## Risques\n\nun [[${remplissage}${accentDecompose} fin\n`
    const a = verifierCoherence(fiche({ corps }))
    expect(a).toHaveLength(1)
    expect(a[0].message).toContain(accentDecompose)
  })

  it('ne signale rien pour des crochets bien formés', () => {
    expect(verifierCoherence(fiche({ corps: '## Risques\n\nla [[clarté]] et [[Intuitivité|intuitif]]\n' }))).toEqual([])
  })

  it('signale une date de modification antérieure à la création', () => {
    const a = verifierCoherence(fiche({ cree: new Date('2026-10-03'), modifie: new Date('2026-01-01') }))
    expect(a.map((x) => x.message).join()).toMatch(/modifie/)
  })

  it('cumule plusieurs avertissements sur une même fiche', () => {
    expect(verifierCoherence(fiche({ statut: 'propose', suggestions: [], corps: 'rien' }))).toHaveLength(2)
  })

  it('signale deux alternatives que la normalisation rend identiques', () => {
    const a = verifierCoherence(fiche({ statut: 'propose', suggestions: ['Avoir', 'avoir'] }))
    expect(a.map((x) => x.message).join()).toMatch(/même empreinte|identiques/i)
  })

  it('ne signale rien pour deux alternatives réellement distinctes', () => {
    expect(
      verifierCoherence(fiche({ statut: 'propose', suggestions: ['avoir', 'ressources'] })),
    ).toEqual([])
  })
})

describe('verifierCorpus', () => {
  it('ne signale rien sur le corpus réel du dépôt, hors rappels sur les sources', () => {
    // Les sources de seconde main sont listées à dessein à chaque vérification :
    // c’est la file de relecture. Tout autre avertissement reste une anomalie.
    const autres = verifierCorpus(getFiches(DOSSIER_CONTENU)).filter(
      (a) => !/^source de seconde main/.test(a.message),
    )
    expect(autres).toEqual([])
  })

  it('rend une liste vide pour un corpus vide', () => {
    expect(verifierCorpus([])).toEqual([])
  })
})

describe('verifierDocuments', () => {
  it('signale un marqueur URL-DU-DEPOT résiduel', () => {
    const a = verifierDocuments([{ nom: 'contribuer', texte: 'Voir `URL-DU-DEPOT`.' }])
    expect(a).toHaveLength(1)
    expect(a[0]).toEqual({ slug: 'contribuer', message: expect.stringMatching(/URL-DU-DEPOT/) })
  })

  it('ne signale rien pour un document sans marqueur', () => {
    expect(verifierDocuments([{ nom: 'manifeste', texte: 'Rien à signaler ici.' }])).toEqual([])
  })
})

describe('verifierChantiers', () => {
  function chantier(p: Partial<Chantier> = {}): Chantier {
    return {
      slug: 'vocabulaire-du-bilan',
      nom: 'Le vocabulaire du bilan',
      discipline: 'comptabilite',
      resume: 'court',
      cree: new Date('2026-10-04'),
      modifie: new Date('2026-10-04'),
      corps: '## Risques\n\ntexte\n',
      ...p,
    }
  }

  function ficheDe(slug: string, chantierSlug?: string): Fiche {
    return fiche({ slug, chantier: chantierSlug })
  }

  it('ne signale rien pour un chantier sain', () => {
    expect(
      verifierChantiers(
        [chantier()],
        [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan'), ficheDe('passif-comptabilite', 'vocabulaire-du-bilan')],
      ),
    ).toEqual([])
  })

  it('signale un chantier qu’aucune fiche ne désigne', () => {
    const a = verifierChantiers([chantier()], [ficheDe('actif-comptabilite')])
    expect(a).toHaveLength(1)
    expect(a[0].slug).toBe('vocabulaire-du-bilan')
    expect(a[0].message).toMatch(/aucune fiche/i)
  })

  it('signale un chantier qui n’a qu’une seule fiche', () => {
    const a = verifierChantiers([chantier()], [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan')])
    expect(a.map((x) => x.message).join()).toMatch(/une seule fiche/i)
  })

  it('signale un chantier sans section « risques »', () => {
    const a = verifierChantiers(
      [chantier({ corps: '## Pourquoi\n\ntexte\n' })],
      [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan'), ficheDe('passif-comptabilite', 'vocabulaire-du-bilan')],
    )
    expect(a.map((x) => x.message).join()).toMatch(/risques/i)
  })

  it('signale une date de modification antérieure à la création', () => {
    const a = verifierChantiers(
      [chantier({ cree: new Date('2026-10-04'), modifie: new Date('2026-10-01') })],
      [ficheDe('actif-comptabilite', 'vocabulaire-du-bilan'), ficheDe('passif-comptabilite', 'vocabulaire-du-bilan')],
    )
    expect(a.map((x) => x.message).join()).toMatch(/modifie/i)
  })

  it('signale chaque chantier du corpus, et pas seulement le premier', () => {
    const avertissements = verifierChantiers(
      [
        chantier(),
        chantier({ slug: 'structures-algebriques', nom: 'Les structures', corps: '## Pourquoi\n\ntexte\n' }),
      ],
      [ficheDe('actif-comptabilite'), ficheDe('passif-comptabilite')],
    )
    const slugs = new Set(avertissements.map((a) => a.slug))
    expect(slugs).toContain('vocabulaire-du-bilan')
    expect(slugs).toContain('structures-algebriques')
  })
})

describe('verifierMotifs', () => {
  function motif(p: Partial<Motif> = {}): Motif {
    return {
      slug: 'positif-et-negatif',
      nom: 'Positif et négatif',
      resume: 'court',
      cree: new Date('2026-10-31'),
      modifie: new Date('2026-10-31'),
      corps: '## Le piège\n\ntexte\n',
      ...p,
    }
  }

  const rattachee = (slug: string, discipline: string) =>
    fiche({ slug, discipline, motifs: ['positif-et-negatif'] })

  it('ne signale rien pour un motif sain', () => {
    expect(
      verifierMotifs(
        [motif()],
        [rattachee('a-droit', 'droit'), rattachee('b-economie', 'economie')],
      ),
    ).toEqual([])
  })

  it('avertit un motif relié à moins de deux fiches', () => {
    const zero = verifierMotifs([motif()], [fiche()])
    expect(zero).toHaveLength(1)
    expect(zero[0].message).toMatch(/aucune fiche/)

    const une = verifierMotifs([motif()], [rattachee('a-droit', 'droit')])
    expect(une).toHaveLength(1)
    expect(une[0].message).toMatch(/une seule fiche/)
  })

  it('avertit un motif dont toutes les fiches sont d’une seule discipline', () => {
    const a = verifierMotifs(
      [motif()],
      [rattachee('a-droit', 'droit'), rattachee('b-droit', 'droit')],
    )
    expect(a).toHaveLength(1)
    expect(a[0].message).toMatch(/une seule discipline.*chantier/)
  })

  it('n’avertit pas le motif réel normal-et-naturel', () => {
    const fiches = getFiches(DOSSIER_CONTENU)
    const motifs = getMotifs(DOSSIER_CONTENU)
    expect(verifierMotifs(motifs, fiches)).toEqual([])
  })
})

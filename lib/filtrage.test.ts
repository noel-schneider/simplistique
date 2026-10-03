import { describe, expect, it } from 'vitest'
import type { FicheIndex } from './content/schema'
import {
  analyserCriteres,
  aUnFiltre,
  CRITERES_VIDES,
  ecrireCriteres,
  filtrerFiches,
  normaliser,
  type SlugsValides,
} from './filtrage'

const valides: SlugsValides = {
  disciplines: ['mathematiques', 'comptabilite', 'theorie-musicale', 'escalade'],
  confusions: ['faux-ami-courant', 'polysemie-externe'],
  statuts: ['pointe', 'propose', 'rejete'],
}

function fiche(p: Partial<FicheIndex>): FicheIndex {
  return {
    slug: 'x',
    terme: 'x',
    discipline: 'mathematiques',
    confusion: 'faux-ami-courant',
    statut: 'pointe',
    resume: '',
    suggestions: [],
    ...p,
  }
}

const CORPUS: FicheIndex[] = [
  fiche({ slug: 'groupe-mathematiques', terme: 'groupe', resume: 'structure algébrique' }),
  fiche({ slug: 'actif-comptabilite', terme: 'actif', discipline: 'comptabilite', statut: 'propose', suggestions: ['avoir'] }),
  fiche({ slug: 'temperament-theorie-musicale', terme: 'tempérament', discipline: 'theorie-musicale', statut: 'rejete' }),
  fiche({ slug: 'mesure-theorie-musicale', terme: 'mesure', discipline: 'theorie-musicale', confusion: 'polysemie-externe' }),
  fiche({ slug: 'mesure-escalade', terme: 'mesure', discipline: 'escalade', confusion: 'polysemie-externe' }),
]

describe('normaliser', () => {
  it('passe en minuscules et retire les accents', () => {
    expect(normaliser('Tempérament')).toBe('temperament')
  })

  it('traite ç, œ et æ', () => {
    expect(normaliser('Ça et Œuvre')).toBe('ca et oeuvre')
  })

  it('réduit les espaces multiples et coupe les bords', () => {
    expect(normaliser('  deux   mots ')).toBe('deux mots')
  })
})

describe('analyserCriteres', () => {
  it('lit une valeur simple', () => {
    const c = analyserCriteres(new URLSearchParams('discipline=escalade'), valides)
    expect(c.disciplines).toEqual(['escalade'])
  })

  it('lit plusieurs valeurs séparées par des virgules', () => {
    const c = analyserCriteres(new URLSearchParams('statut=pointe,rejete'), valides)
    expect(c.statuts).toEqual(['pointe', 'rejete'])
  })

  it('écarte les valeurs inconnues et garde les valides', () => {
    const c = analyserCriteres(new URLSearchParams('discipline=klingon,escalade'), valides)
    expect(c.disciplines).toEqual(['escalade'])
  })

  it('rend des critères vides pour un paramètre vide', () => {
    expect(analyserCriteres(new URLSearchParams('statut='), valides)).toEqual(CRITERES_VIDES)
  })

  it('rend des critères vides pour une URL sans paramètre', () => {
    expect(analyserCriteres(new URLSearchParams(''), valides)).toEqual(CRITERES_VIDES)
  })

  it('conserve la recherche telle que saisie', () => {
    expect(analyserCriteres(new URLSearchParams('q=Tempé'), valides).q).toBe('Tempé')
  })
})

describe('filtrerFiches', () => {
  it('rend tout le corpus sans critère', () => {
    expect(filtrerFiches(CORPUS, CRITERES_VIDES)).toHaveLength(5)
  })

  it('filtre par discipline', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, disciplines: ['comptabilite'] })
    expect(r.map((f) => f.slug)).toEqual(['actif-comptabilite'])
  })

  it('traite plusieurs valeurs d\'un même critère comme un OU', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, statuts: ['propose', 'rejete'] })
    expect(r).toHaveLength(2)
  })

  it('traite deux critères différents comme un ET', () => {
    const r = filtrerFiches(CORPUS, {
      ...CRITERES_VIDES,
      disciplines: ['theorie-musicale'],
      confusions: ['polysemie-externe'],
    })
    expect(r.map((f) => f.slug)).toEqual(['mesure-theorie-musicale'])
  })

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'TEMPERAMENT' })).toHaveLength(1)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'tempé' })).toHaveLength(1)
  })

  it('cherche aussi dans le resume et les suggestions', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'algébrique' })).toHaveLength(1)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'avoir' })).toHaveLength(1)
  })

  it('rend les deux fiches d\'un même terme analysé dans deux disciplines', () => {
    const r = filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'mesure' })
    expect(r.map((f) => f.discipline).sort()).toEqual(['escalade', 'theorie-musicale'])
  })

  it('traite la recherche comme du texte, jamais comme une expression régulière', () => {
    expect(() => filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '(' })).not.toThrow()
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '.*' })).toHaveLength(0)
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: '<script>' })).toHaveLength(0)
  })

  it('rend une liste vide, pas le corpus entier, quand rien ne correspond', () => {
    expect(filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'licorne' })).toEqual([])
  })

  it('ne modifie pas le tableau reçu', () => {
    const copie = [...CORPUS]
    filtrerFiches(CORPUS, { ...CRITERES_VIDES, q: 'mesure' })
    expect(CORPUS).toEqual(copie)
  })
})

describe('ecrireCriteres', () => {
  it('écrit les critères actifs et omet les vides', () => {
    expect(ecrireCriteres({ ...CRITERES_VIDES, disciplines: ['escalade'], q: 'mesure' }))
      .toBe('discipline=escalade&q=mesure')
  })

  it('joint les valeurs multiples par des virgules', () => {
    expect(ecrireCriteres({ ...CRITERES_VIDES, statuts: ['pointe', 'rejete'] })).toBe('statut=pointe%2Crejete')
  })

  it('n\'écrit la vue que lorsqu\'elle est fournie', () => {
    expect(ecrireCriteres(CRITERES_VIDES)).toBe('')
    expect(ecrireCriteres(CRITERES_VIDES, 'carte')).toBe('vue=carte')
  })

  it('fait l\'aller-retour avec analyserCriteres', () => {
    const criteres = { disciplines: ['escalade'], confusions: [], statuts: ['pointe'], q: 'mesure' }
    expect(analyserCriteres(new URLSearchParams(ecrireCriteres(criteres)), valides)).toEqual(criteres)
  })
})

describe('aUnFiltre', () => {
  it('est faux sans critère', () => {
    expect(aUnFiltre(CRITERES_VIDES)).toBe(false)
  })

  it('est vrai dès qu\'un critère est posé', () => {
    expect(aUnFiltre({ ...CRITERES_VIDES, q: 'a' })).toBe(true)
    expect(aUnFiltre({ ...CRITERES_VIDES, statuts: ['pointe'] })).toBe(true)
  })
})

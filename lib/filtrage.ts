import type { FicheIndex } from './content/schema'

export type Criteres = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
  q: string
}

export type SlugsValides = {
  disciplines: string[]
  confusions: string[]
  statuts: string[]
}

export const CRITERES_VIDES: Criteres = { disciplines: [], confusions: [], statuts: [], q: '' }

export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function lireListe(params: URLSearchParams, cle: string, autorises: string[]): string[] {
  const brut = params.get(cle)
  if (!brut) return []
  return brut
    .split(',')
    .map((v) => v.trim())
    .filter((v) => autorises.includes(v))
}

export function analyserCriteres(params: URLSearchParams, valides: SlugsValides): Criteres {
  return {
    disciplines: lireListe(params, 'discipline', valides.disciplines),
    confusions: lireListe(params, 'confusion', valides.confusions),
    statuts: lireListe(params, 'statut', valides.statuts),
    q: params.get('q') ?? '',
  }
}

export function ecrireCriteres(criteres: Criteres, vue?: 'carte' | 'liste'): string {
  const params = new URLSearchParams()
  if (vue) params.set('vue', vue)
  if (criteres.disciplines.length) params.set('discipline', criteres.disciplines.join(','))
  if (criteres.confusions.length) params.set('confusion', criteres.confusions.join(','))
  if (criteres.statuts.length) params.set('statut', criteres.statuts.join(','))
  if (criteres.q.trim()) params.set('q', criteres.q.trim())
  return params.toString()
}

export function aUnFiltre(criteres: Criteres): boolean {
  return (
    criteres.disciplines.length > 0 ||
    criteres.confusions.length > 0 ||
    criteres.statuts.length > 0 ||
    criteres.q.trim() !== ''
  )
}

export function filtrerFiches(index: FicheIndex[], criteres: Criteres): FicheIndex[] {
  const recherche = normaliser(criteres.q)

  return index.filter((fiche) => {
    if (criteres.disciplines.length && !criteres.disciplines.includes(fiche.discipline)) return false
    if (criteres.confusions.length && !criteres.confusions.includes(fiche.confusion)) return false
    if (criteres.statuts.length && !criteres.statuts.includes(fiche.statut)) return false
    if (!recherche) return true

    const champs = [fiche.terme, fiche.resume, ...fiche.suggestions]
    return champs.some((champ) => normaliser(champ).includes(recherche))
  })
}

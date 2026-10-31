import { describe, expect, it } from 'vitest'
import { chargerTaxonomies, DOSSIER_CONTENU } from './taxonomies'
import { creerSchemaFiche } from './schema'

const schema = creerSchemaFiche(chargerTaxonomies(DOSSIER_CONTENU))

const BASE = {
  terme: 'groupe',
  discipline: 'mathematiques',
  confusion: 'faux-ami-courant',
  statut: 'pointe',
  preuve: 'documentee',
  resume: 'Un mot courant au sens technique étranger.',
  suggestions: [],
  cree: '2026-10-03',
  modifie: '2026-10-03',
}

const SOURCE = { auteur: 'Okun', annee: 1989, titre: 'Le mot « relativité »', lecture: 'originale' }

function message(entree: unknown): string {
  const r = schema.safeParse(entree)
  if (r.success) throw new Error('la fiche aurait dû être refusée')
  return r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' ; ')
}

describe('preuve et sources dans le schéma', () => {
  it('refuse une fiche sans preuve', () => {
    const sansPreuve: Record<string, unknown> = { ...BASE }
    delete sansPreuve.preuve
    expect(message(sansPreuve)).toMatch(/preuve/)
  })

  it('refuse une preuve hors liste', () => {
    expect(message({ ...BASE, preuve: 'forte' })).toMatch(/preuve/)
  })

  it('accepte sources absentes et les rend comme []', () => {
    const r = schema.parse(BASE)
    expect(r.sources).toEqual([])
  })

  it('accepte une source complète, avec ou sans url', () => {
    const r = schema.parse({
      ...BASE,
      sources: [SOURCE, { ...SOURCE, url: 'https://arxiv.org/abs/astro-ph/0310342' }],
    })
    expect(r.sources).toHaveLength(2)
  })

  it('refuse une source sans titre ni objet', () => {
    const sansTitre: Record<string, unknown> = { ...SOURCE }
    delete sansTitre.titre
    expect(message({ ...BASE, sources: [sansTitre] })).toMatch(/titre ni objet/)
  })

  it('accepte une source avec objet seul', () => {
    const objetSeul: Record<string, unknown> = { ...SOURCE, objet: 'propos sur la Fed' }
    delete objetSeul.titre
    expect(schema.safeParse({ ...BASE, sources: [objetSeul] }).success).toBe(true)
  })

  it('refuse une source sans lecture', () => {
    const sansLecture: Record<string, unknown> = { ...SOURCE }
    delete sansLecture.lecture
    expect(message({ ...BASE, sources: [sansLecture] })).toMatch(/lecture/)
  })

  it('refuse une lecture inconnue', () => {
    expect(message({ ...BASE, sources: [{ ...SOURCE, lecture: 'survolee' }] })).toMatch(/lecture/)
  })

  it('refuse une clé inconnue dans une source', () => {
    expect(message({ ...BASE, sources: [{ ...SOURCE, page: 12 }] })).toMatch(/page/)
  })

  it('refuse une url qui n’est pas http(s)', () => {
    expect(message({ ...BASE, sources: [{ ...SOURCE, url: 'javascript:alert(1)' }] })).toMatch(/url/)
    expect(message({ ...BASE, sources: [{ ...SOURCE, url: 'ftp://exemple.org/a' }] })).toMatch(/url/)
  })

  it('accepte une annee entière entre 1500 et l’année courante + 1', () => {
    const avec = (annee: number) => ({ ...BASE, sources: [{ ...SOURCE, annee }] })
    const suivante = new Date().getFullYear() + 1
    expect(schema.safeParse(avec(1500)).success).toBe(true)
    expect(schema.safeParse(avec(suivante)).success).toBe(true)
    expect(schema.safeParse(avec(1499)).success).toBe(false)
    expect(schema.safeParse(avec(suivante + 1)).success).toBe(false)
    expect(schema.safeParse(avec(1989.5)).success).toBe(false)
  })
})

describe('precedents dans le schéma', () => {
  const PRECEDENT = { lieu: 'Japon', annee: 2002, description: 'Renommage en « trouble de l’intégration »' }

  it('accepte precedents absents et les rend comme []', () => {
    const r = schema.safeParse(BASE)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.precedents).toEqual([])
  })

  it('accepte un précédent complet', () => {
    const r = schema.safeParse({ ...BASE, precedents: [PRECEDENT] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.precedents).toEqual([PRECEDENT])
  })

  it('refuse un précédent sans description', () => {
    const sansDescription: Record<string, unknown> = { ...PRECEDENT }
    delete sansDescription.description
    expect(message({ ...BASE, precedents: [sansDescription] })).toMatch(/description/)
  })

  it('refuse une clé inconnue', () => {
    expect(message({ ...BASE, precedents: [{ ...PRECEDENT, pays: 'JP' }] })).toMatch(/pays/)
  })

  it('applique les mêmes bornes d’année que les sources', () => {
    const avec = (annee: number) => ({ ...BASE, precedents: [{ ...PRECEDENT, annee }] })
    const suivante = new Date().getFullYear() + 1
    expect(schema.safeParse(avec(1500)).success).toBe(true)
    expect(schema.safeParse(avec(suivante)).success).toBe(true)
    expect(schema.safeParse(avec(1499)).success).toBe(false)
    expect(schema.safeParse(avec(suivante + 1)).success).toBe(false)
    expect(schema.safeParse(avec(2002.5)).success).toBe(false)
  })
})

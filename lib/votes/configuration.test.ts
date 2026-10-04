import { describe, expect, it } from 'vitest'
import { codeHttp, configurationVotes } from './configuration'

describe('configurationVotes', () => {
  it('rend la configuration quand les deux variables sont là', () => {
    expect(configurationVotes({ DATABASE_URL: 'postgres://x', SEL_VOTES: 'abc' })).toEqual({
      url: 'postgres://x',
      sel: 'abc',
    })
  })

  it('rend null si la base manque', () => {
    expect(configurationVotes({ SEL_VOTES: 'abc' })).toBeNull()
  })

  it('rend null si le sel manque — jamais de hachage sans sel', () => {
    expect(configurationVotes({ DATABASE_URL: 'postgres://x' })).toBeNull()
  })

  it('rend null si le sel est une chaîne d’espaces', () => {
    expect(configurationVotes({ DATABASE_URL: 'postgres://x', SEL_VOTES: '   ' })).toBeNull()
  })
})

describe('codeHttp', () => {
  it('traduit chaque issue du service', () => {
    expect(codeHttp({ type: 'ok', comptes: { fiche: 0, alternatives: {} }, miens: { fiche: false, alternatives: [] } })).toBe(200)
    expect(codeHttp({ type: 'inconnu' })).toBe(404)
    expect(codeHttp({ type: 'deja' })).toBe(409)
    expect(codeHttp({ type: 'absent' })).toBe(409)
    expect(codeHttp({ type: 'trop' })).toBe(429)
  })
})

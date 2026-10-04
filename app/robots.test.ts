import { describe, expect, it } from 'vitest'
import robots from './robots'

describe('robots', () => {
  it('autorise tout et pointe vers le plan de site', () => {
    const resultat = robots()

    expect(resultat.rules).toMatchObject({ userAgent: '*', allow: '/' })
    expect(resultat.sitemap).toMatch(/\/sitemap\.xml$/)
  })
})

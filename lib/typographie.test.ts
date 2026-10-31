import { describe, expect, it } from 'vitest'
import { typographier } from './typographie'

const FINE = ' '
const INSECABLE = ' '

describe('typographier', () => {
  it.each([';', '!', '?', '%', '»'])('met une espace fine insécable avant « %s »', (signe) => {
    expect(typographier(`mot ${signe}`)).toBe(`mot${FINE}${signe}`)
  })

  it('met une espace fine insécable après « «', () => {
    expect(typographier('« mot')).toBe(`«${FINE}mot`)
  })

  it('met une espace insécable ordinaire avant « : »', () => {
    expect(typographier('Note : voir')).toBe(`Note${INSECABLE}: voir`)
  })

  it('traite une paire de guillemets', () => {
    expect(typographier('il dit « bonjour » hier')).toBe(`il dit «${FINE}bonjour${FINE}» hier`)
  })

  it('traite « 30 % »', () => {
    expect(typographier('30 %')).toBe(`30${FINE}%`)
  })

  it('est idempotente', () => {
    const une = typographier('« Quoi ? » dit-il : 30 % ; oui !')
    expect(typographier(une)).toBe(une)
  })

  it('laisse une URL intacte (aucune espace en jeu)', () => {
    expect(typographier('https://x.y/a?b=c')).toBe('https://x.y/a?b=c')
  })

  it('ne touche pas aux autres espaces', () => {
    expect(typographier('un texte sans rien')).toBe('un texte sans rien')
  })
})

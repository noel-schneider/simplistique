import { describe, expect, it } from 'vitest'
import { adresseDeLEnTete, empreinteAlternative, empreinteVotant } from './empreintes'

describe('empreinteAlternative', () => {
  it('rend seize caractères hexadécimaux', () => {
    expect(empreinteAlternative('avoir')).toMatch(/^[0-9a-f]{16}$/)
  })

  it('est stable pour le même texte', () => {
    expect(empreinteAlternative('avoir')).toBe(empreinteAlternative('avoir'))
  })

  it('ignore la casse, les accents et les espaces superflus', () => {
    expect(empreinteAlternative('Avoir')).toBe(empreinteAlternative('avoir'))
    expect(empreinteAlternative('  avoir ')).toBe(empreinteAlternative('avoir'))
    expect(empreinteAlternative('Tempérament')).toBe(empreinteAlternative('temperament'))
  })

  it('distingue deux textes différents', () => {
    expect(empreinteAlternative('avoir')).not.toBe(empreinteAlternative('ressources'))
  })
})

describe('adresseDeLEnTete', () => {
  it('prend la première adresse d’une liste de mandataires', () => {
    expect(adresseDeLEnTete('203.0.113.7, 198.51.100.2, 192.0.2.9')).toBe('203.0.113.7')
  })

  it('élague les espaces', () => {
    expect(adresseDeLEnTete('  203.0.113.7  ')).toBe('203.0.113.7')
  })

  it('accepte une adresse IPv6', () => {
    expect(adresseDeLEnTete('2001:db8::1')).toBe('2001:db8::1')
  })

  it('rend une valeur de repli quand l’en-tête est absent', () => {
    expect(adresseDeLEnTete(null)).toBe('inconnue')
    expect(adresseDeLEnTete('')).toBe('inconnue')
  })
})

describe('empreinteVotant', () => {
  it('rend soixante-quatre caractères hexadécimaux', () => {
    expect(empreinteVotant('sel', '203.0.113.7', 'Mozilla/5.0')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('est stable pour les mêmes entrées', () => {
    const a = empreinteVotant('sel', '203.0.113.7', 'Mozilla/5.0')
    const b = empreinteVotant('sel', '203.0.113.7', 'Mozilla/5.0')
    expect(a).toBe(b)
  })

  it('change si le sel change — c’est ce qui permet de réinitialiser la déduplication', () => {
    expect(empreinteVotant('sel-a', '203.0.113.7', 'M')).not.toBe(
      empreinteVotant('sel-b', '203.0.113.7', 'M'),
    )
  })

  it('distingue deux navigateurs sur la même adresse', () => {
    expect(empreinteVotant('sel', '203.0.113.7', 'Firefox')).not.toBe(
      empreinteVotant('sel', '203.0.113.7', 'Safari'),
    )
  })

  it('distingue deux adresses avec le même navigateur', () => {
    expect(empreinteVotant('sel', '203.0.113.7', 'M')).not.toBe(
      empreinteVotant('sel', '198.51.100.2', 'M'),
    )
  })

  it('refuse un sel vide ou absent', () => {
    expect(() => empreinteVotant('', '203.0.113.7', 'M')).toThrow(/sel/i)
    expect(() => empreinteVotant('   ', '203.0.113.7', 'M')).toThrow(/sel/i)
    // `process.env.SEL_VOTES` vaut `undefined` quand la variable n’est pas définie :
    // c’est le cas « absent », et il doit lever la même erreur explicite,
    // pas un TypeError générique qui ne nomme pas le sel.
    expect(() => empreinteVotant(undefined as unknown as string, '203.0.113.7', 'M')).toThrow(
      /sel/i,
    )
  })
})

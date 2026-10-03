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

  // Comportement documenté, pas souhaitable : deux alternatives d'une même fiche
  // dont le texte ne diffère que par la casse partagent une empreinte, donc leurs
  // votes fusionnent. L'avertissement de lint:content (Tâche 7) le signale.
  it('fusionne deux alternatives que la normalisation rend identiques', () => {
    expect(empreinteAlternative('Avoir')).toBe(empreinteAlternative('avoir'))
  })
})

describe('adresseDeLEnTete', () => {
  it('prend la premiÃ¨re adresse d’une liste de mandataires', () => {
    expect(adresseDeLEnTete('203.0.113.7, 198.51.100.2, 192.0.2.9')).toBe('203.0.113.7')
  })

  it('élague les espaces', () => {
    expect(adresseDeLEnTete('  203.0.113.7  ')).toBe('203.0.113.7')
  })

  it('accepte une adresse IPv6', () => {
    expect(adresseDeLEnTete('2001:db8::1')).toBe('2001:db8::1')
  })

  it('rend une valeur de repli quand l’en-tÃªte est absent', () => {
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

  it('change si le sel change â c’est ce qui permet de rÃ©initialiser la dÃ©duplication', () => {
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

  it('ne contient l’adresse en clair nulle part', () => {
    expect(empreinteVotant('sel', '203.0.113.7', 'M')).not.toContain('203.0.113.7')
  })

  it('refuse un sel vide ou absent', () => {
    expect(() => empreinteVotant('', '203.0.113.7', 'M')).toThrow(/sel/i)
    expect(() => empreinteVotant('   ', '203.0.113.7', 'M')).toThrow(/sel/i)
  })
})

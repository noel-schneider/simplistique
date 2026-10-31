import { describe, expect, it } from 'vitest'
import type { FicheMeta } from './content/schema'
import { contenuImagePartage } from './partage'

const BASE = { terme: 'Biais', resume: 'Le résumé.' } as FicheMeta

describe('contenuImagePartage', () => {
  it('préfère l’accroche au résumé', () => {
    const c = contenuImagePartage({ ...BASE, accroche: 'La phrase-choc.' }, 'Psychologie')
    expect(c).toEqual({ titre: 'Biais', phrase: 'La phrase-choc.', pied: 'Simplistique · Psychologie' })
  })
  it('retombe sur le résumé sans accroche', () => {
    expect(contenuImagePartage(BASE, 'Droit').phrase).toBe('Le résumé.')
  })
  it('pose les insécables françaises sur les textes de l’image', () => {
    const c = contenuImagePartage({ ...BASE, accroche: 'Vraiment ?' }, 'Droit')
    expect(c.phrase).toBe('Vraiment\u202F?')
  })
})

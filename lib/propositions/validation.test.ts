import { describe, expect, it } from 'vitest'
import { validerProposition } from './validation'

const POURQUOI = 'Le mot dit le contraire de ce qu’il désigne.'

describe('validerProposition', () => {
  it('accepte une proposition complète, chaînes nettoyées', () => {
    expect(
      validerProposition({
        terme: '  Actif ',
        discipline: ' Comptabilité ',
        pourquoi: `  ${POURQUOI}  `,
        suggestion: ' Avoirs ',
      }),
    ).toEqual({
      ok: true,
      proposition: {
        terme: 'Actif',
        discipline: 'Comptabilité',
        pourquoi: POURQUOI,
        suggestion: 'Avoirs',
      },
    })
  })

  it('rend les champs facultatifs absents comme des chaînes vides', () => {
    expect(validerProposition({ terme: 'Actif', pourquoi: POURQUOI })).toEqual({
      ok: true,
      proposition: { terme: 'Actif', discipline: '', pourquoi: POURQUOI, suggestion: '' },
    })
  })

  it('exige terme et pourquoi', () => {
    expect(validerProposition({})).toEqual({ ok: false, erreur: 'invalide', champs: ['terme', 'pourquoi'] })
    // Une chaîne d’espaces n’est pas un terme : le `trim` passe avant le contrôle.
    expect(validerProposition({ terme: '   ', pourquoi: POURQUOI })).toEqual({
      ok: false,
      erreur: 'invalide',
      champs: ['terme'],
    })
  })

  it('refuse pourquoi de moins de 20 caractères', () => {
    expect(validerProposition({ terme: 'Actif', pourquoi: 'trop court' })).toEqual({
      ok: false,
      erreur: 'invalide',
      champs: ['pourquoi'],
    })
    // Pile 20 caractères passe ; les espaces autour ne comptent pas.
    expect(validerProposition({ terme: 'Actif', pourquoi: `  ${'a'.repeat(20)}  ` })).toMatchObject({ ok: true })
    expect(validerProposition({ terme: 'Actif', pourquoi: `  ${'a'.repeat(19)}  ` })).toMatchObject({ ok: false })
  })

  it('refuse chaque champ au-delà de sa limite (120/80/2000/200)', () => {
    const limites = { terme: 120, discipline: 80, pourquoi: 2000, suggestion: 200 }
    const base = { terme: 'Actif', pourquoi: POURQUOI }
    for (const [champ, limite] of Object.entries(limites)) {
      const pile = 'a'.repeat(limite)
      expect(validerProposition({ ...base, [champ]: pile }), champ).toMatchObject({ ok: true })
      expect(validerProposition({ ...base, [champ]: `${pile}a` }), champ).toEqual({
        ok: false,
        erreur: 'invalide',
        champs: [champ],
      })
    }
  })

  it('compte les caractères et non les unités UTF-16', () => {
    // Un emoji vaut deux unités UTF-16 : `.length` refuserait 61 emojis dans un terme
    // de 120 caractères, alors que le visiteur n’en voit que 61.
    expect(validerProposition({ terme: '🦊'.repeat(120), pourquoi: POURQUOI })).toMatchObject({ ok: true })
  })

  it('refuse un champ qui n’est pas une chaîne', () => {
    expect(validerProposition({ terme: 42, pourquoi: ['x'] })).toEqual({
      ok: false,
      erreur: 'invalide',
      champs: ['terme', 'pourquoi'],
    })
  })

  it('ignore les clés inconnues sans échouer', () => {
    const issue = validerProposition({ terme: 'Actif', pourquoi: POURQUOI, auteur: 'pirate', id: 3 })
    expect(issue).toMatchObject({ ok: true })
    expect(Object.keys((issue as { proposition: object }).proposition).sort()).toEqual(
      ['discipline', 'pourquoi', 'suggestion', 'terme'],
    )
  })

  it('ignore un `contact` envoyé par un ancien client : il n’est jamais conservé', () => {
    const issue = validerProposition({ terme: 'Actif', pourquoi: POURQUOI, contact: 'moi@exemple.org' })
    expect(issue).toEqual({
      ok: true,
      proposition: { terme: 'Actif', discipline: '', pourquoi: POURQUOI, suggestion: '' },
    })
    expect(JSON.stringify(issue)).not.toContain('moi@exemple.org')
    // Même une valeur invalide pour l’ancien champ ne fait pas échouer l’envoi.
    expect(validerProposition({ terme: 'Actif', pourquoi: POURQUOI, contact: ['x'] })).toMatchObject({ ok: true })
  })

  it('champ site rempli → piege', () => {
    expect(validerProposition({ terme: 'Actif', pourquoi: POURQUOI, site: 'http://spam' })).toEqual({
      ok: true,
      piege: true,
    })
    // Un robot qui remplit tout sans soin n’envoie pas forcément le reste valide :
    // le piège doit l’emporter, sinon la réponse 400 lui apprendrait quoi corriger.
    expect(validerProposition({ site: 'x' })).toEqual({ ok: true, piege: true })
  })

  it('un champ site vide ou fait d’espaces n’est pas un piège', () => {
    expect(validerProposition({ terme: 'Actif', pourquoi: POURQUOI, site: '  ' })).toMatchObject({
      ok: true,
      proposition: { terme: 'Actif' },
    })
  })

  it('refuse les caractères de contrôle (NUL, ESC, DEL, C1)', () => {
    for (const valeur of ['Act\u0000if', 'Actif\x1b[2J', 'Actif\u007f', 'Actif\u0085', 'Act\rif']) {
      expect(validerProposition({ terme: valeur, pourquoi: POURQUOI }), JSON.stringify(valeur)).toEqual({
        ok: false,
        erreur: 'invalide',
        champs: ['terme'],
      })
    }
    // Un champ facultatif n’y échappe pas.
    expect(validerProposition({ terme: 'Actif', pourquoi: POURQUOI, suggestion: 'Avo\u0000irs' })).toEqual({
      ok: false,
      erreur: 'invalide',
      champs: ['suggestion'],
    })
  })

  it('accepte \\n et \\t, et normalise \\r\\n en \\n', () => {
    const pourquoi = `${POURQUOI}\r\n\tdeuxième ligne\ntroisième`
    expect(validerProposition({ terme: 'Actif', pourquoi })).toMatchObject({
      ok: true,
      proposition: { pourquoi: `${POURQUOI}\n\tdeuxième ligne\ntroisième` },
    })
  })

  it('corps non objet → invalide', () => {
    for (const corps of [null, undefined, 'texte', 42, ['terme']]) {
      expect(validerProposition(corps)).toEqual({
        ok: false,
        erreur: 'invalide',
        champs: ['terme', 'pourquoi'],
      })
    }
  })
})

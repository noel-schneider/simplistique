import { describe, expect, it } from 'vitest'
import { neutraliserControles } from './affichage-propositions'

describe('neutraliserControles', () => {
  it('rend visibles les caractères de contrôle C0, DEL et C1', () => {
    expect(neutraliserControles('a\u0000b')).toBe('a\\u{0}b')
    // Une séquence d’échappement ANSI ne doit pas pouvoir effacer le terminal.
    expect(neutraliserControles('\x1b[2J')).toBe('\\u{1b}[2J')
    expect(neutraliserControles('a\rb')).toBe('a\\u{d}b')
    expect(neutraliserControles('\u007f\u0085\u009f')).toBe('\\u{7f}\\u{85}\\u{9f}')
  })

  it('laisse passer \\n, \\t et le texte ordinaire', () => {
    const texte = 'Ligne une\n\tLigne deux — l’été 🦊 « ok »'
    expect(neutraliserControles(texte)).toBe(texte)
  })
})

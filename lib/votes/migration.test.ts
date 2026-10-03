import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHEMIN_MIGRATION, instructionsSql } from './migration'

describe('instructionsSql', () => {
  it('découpe la migration réelle en trois instructions, chacune commençant par CREATE', () => {
    const texte = readFileSync(join(process.cwd(), CHEMIN_MIGRATION), 'utf8')
    const instructions = instructionsSql(texte)
    expect(instructions).toHaveLength(3)
    for (const instruction of instructions) {
      expect(instruction.startsWith('CREATE')).toBe(true)
    }
  })

  it('aucune instruction rendue ne contient de point-virgule', () => {
    const texte = readFileSync(join(process.cwd(), CHEMIN_MIGRATION), 'utf8')
    const instructions = instructionsSql(texte)
    for (const instruction of instructions) {
      expect(instruction).not.toContain(';')
    }
  })

  it('un commentaire après la dernière instruction ne produit pas d’instruction fantôme', () => {
    const texte = 'CREATE TABLE t (x int);\n-- commentaire final\n'
    expect(instructionsSql(texte)).toHaveLength(1)
  })
})

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fichiersDeMigration, instructionsDeToutesLesMigrations, instructionsSql } from './migration'

describe('instructionsSql', () => {
  it('rend chaque instruction entière, sans en perdre un morceau', () => {
    // L’assertion porte sur le contenu, pas sur l’absence de `;` : tout découpage
    // par `split(';')` la satisferait par construction, quelle que soit la suite.
    const texte = 'CREATE TABLE a (x int);\n-- un commentaire\nCREATE INDEX i ON a (x);\n'
    expect(instructionsSql(texte)).toEqual([
      'CREATE TABLE a (x int)',
      '-- un commentaire\nCREATE INDEX i ON a (x)',
    ])
  })

  it('un commentaire après la dernière instruction ne produit pas d’instruction fantôme', () => {
    const texte = 'CREATE TABLE t (x int);\n-- commentaire final\n'
    expect(instructionsSql(texte)).toHaveLength(1)
  })
})

describe('instructionsDeToutesLesMigrations', () => {
  let dossier: string | null = null

  afterEach(() => {
    if (dossier) rmSync(dossier, { recursive: true, force: true })
    dossier = null
  })

  it('lit les fichiers dans l’ordre', () => {
    dossier = mkdtempSync(join(tmpdir(), 'migrations-'))
    // Écrits dans le désordre, pour ne pas dépendre de l’ordre que rend le système
    // de fichiers. `010` après `002` : l’ordre est celui des chaînes, d’où les zéros.
    writeFileSync(join(dossier, '010-c.sql'), 'CREATE TABLE c (x int);')
    writeFileSync(join(dossier, '001-a.sql'), 'CREATE TABLE a (x int);\nCREATE INDEX ia ON a (x);')
    writeFileSync(join(dossier, '002-b.sql'), 'CREATE TABLE b (x int);')
    writeFileSync(join(dossier, 'LISEZMOI.md'), 'pas du SQL; pas une migration;')
    expect(fichiersDeMigration(dossier)).toEqual(['001-a.sql', '002-b.sql', '010-c.sql'])
    expect(instructionsDeToutesLesMigrations(dossier)).toEqual([
      'CREATE TABLE a (x int)',
      'CREATE INDEX ia ON a (x)',
      'CREATE TABLE b (x int)',
      'CREATE TABLE c (x int)',
    ])
  })

  it('découpe les migrations réelles en instructions CREATE idempotentes, votes d’abord', () => {
    const instructions = instructionsDeToutesLesMigrations()
    // 3 pour les votes, 2 pour les propositions, 1 pour l’index par date (003).
    expect(instructions).toHaveLength(6)
    for (const instruction of instructions) {
      expect(instruction).toMatch(/^CREATE (TABLE|INDEX) IF NOT EXISTS /)
    }
    expect(instructions[0]).toContain('votes')
    expect(instructions.some((i) => i.startsWith('CREATE TABLE IF NOT EXISTS propositions'))).toBe(true)
    expect(instructions.at(-1)).toContain('propositions_par_date')
  })
})

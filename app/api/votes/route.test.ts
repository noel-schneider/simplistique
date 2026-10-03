import { beforeEach, describe, expect, it, vi } from 'vitest'
import { depotEnMemoire, type DepotDeVotes } from '@/lib/votes/depot'
import { empreinteAlternative } from '@/lib/votes/empreintes'

let depotCourant: DepotDeVotes

vi.mock('@/lib/votes/depot-postgres', () => ({
  depotPostgres: () => depotCourant,
  executeurNeon: () => async () => [],
}))

const { DELETE, GET, POST } = await import('./route')

// Doit correspondre à une suggestion de content/fiches/actif-comptabilite.md.
const AVOIR = empreinteAlternative('avoirs')

function requete(url: string, init?: RequestInit): Request {
  return new Request(url, {
    ...init,
    headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Vitest', ...(init?.headers ?? {}) },
  })
}

describe('GET /api/votes', () => {
  beforeEach(() => {
    depotCourant = depotEnMemoire()
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('SEL_VOTES', 'sel-de-test')
  })

  it('rend des compteurs à zéro pour une fiche réelle sans vote', async () => {
    const r = await GET(requete('http://x/api/votes?fiche=groupe-mathematiques'))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ fiche: 0, alternatives: {}, miens: { fiche: false, alternatives: [] } })
  })

  it('répond 404 pour une fiche inconnue', async () => {
    const r = await GET(requete('http://x/api/votes?fiche=licorne'))
    expect(r.status).toBe(404)
  })

  it('répond 400 sans paramètre de fiche', async () => {
    const r = await GET(requete('http://x/api/votes'))
    expect(r.status).toBe(400)
  })

  it('répond 503 et n’écrit rien quand le sel est absent', async () => {
    vi.stubEnv('SEL_VOTES', '')
    const r = await GET(requete('http://x/api/votes?fiche=groupe-mathematiques'))
    expect(r.status).toBe(503)
  })
})

describe('POST /api/votes', () => {
  beforeEach(() => {
    depotCourant = depotEnMemoire()
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('SEL_VOTES', 'sel-de-test')
  })

  it('enregistre un vote de fiche', async () => {
    const r = await POST(
      requete('http://x/api/votes', {
        method: 'POST',
        body: JSON.stringify({ fiche: 'groupe-mathematiques', alternative: null }),
      }),
    )
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ fiche: 1, miens: { fiche: true } })
  })

  it('enregistre un vote d’alternative sur une fiche qui en a une', async () => {
    const r = await POST(
      requete('http://x/api/votes', {
        method: 'POST',
        body: JSON.stringify({ fiche: 'actif-comptabilite', alternative: AVOIR }),
      }),
    )
    expect(r.status).toBe(200)
    const corps = await r.json()
    expect(corps.alternatives[AVOIR]).toBe(1)
  })

  it('répond 409 au second vote identique', async () => {
    const corps = JSON.stringify({ fiche: 'groupe-mathematiques', alternative: null })
    await POST(requete('http://x/api/votes', { method: 'POST', body: corps }))
    const r = await POST(requete('http://x/api/votes', { method: 'POST', body: corps }))
    expect(r.status).toBe(409)
  })

  it('répond 404 pour une alternative qui n’appartient pas à la fiche', async () => {
    const r = await POST(
      requete('http://x/api/votes', {
        method: 'POST',
        body: JSON.stringify({ fiche: 'groupe-mathematiques', alternative: AVOIR }),
      }),
    )
    expect(r.status).toBe(404)
  })

  it('répond 400 pour un corps mal formé', async () => {
    const r = await POST(requete('http://x/api/votes', { method: 'POST', body: 'pas du json' }))
    expect(r.status).toBe(400)
  })

  it('deux navigateurs différents comptent pour deux votants', async () => {
    const corps = JSON.stringify({ fiche: 'groupe-mathematiques', alternative: null })
    await POST(requete('http://x/api/votes', { method: 'POST', body: corps }))
    const r = await POST(
      new Request('http://x/api/votes', {
        method: 'POST',
        body: corps,
        headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Autre navigateur' },
      }),
    )
    expect(r.status).toBe(200)
    expect((await r.json()).fiche).toBe(2)
  })
})

describe('DELETE /api/votes', () => {
  beforeEach(() => {
    depotCourant = depotEnMemoire()
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('SEL_VOTES', 'sel-de-test')
  })

  it('annule son propre vote', async () => {
    const corps = JSON.stringify({ fiche: 'groupe-mathematiques', alternative: null })
    await POST(requete('http://x/api/votes', { method: 'POST', body: corps }))
    const r = await DELETE(requete('http://x/api/votes', { method: 'DELETE', body: corps }))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ fiche: 0, miens: { fiche: false } })
  })

  it('répond 409 si le vote n’existe pas', async () => {
    const r = await DELETE(
      requete('http://x/api/votes', {
        method: 'DELETE',
        body: JSON.stringify({ fiche: 'groupe-mathematiques', alternative: null }),
      }),
    )
    expect(r.status).toBe(409)
  })
})

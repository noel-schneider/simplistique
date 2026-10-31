import { beforeEach, describe, expect, it, vi } from 'vitest'
import { depotEnMemoire, type DepotDePropositions } from '@/lib/propositions/depot'

let depotCourant: DepotDePropositions

vi.mock('@/lib/propositions/depot-postgres', () => ({
  depotPostgres: () => depotCourant,
}))
vi.mock('@/lib/votes/depot-postgres', () => ({
  executeurNeon: () => async () => [],
}))

const { POST } = await import('./route')

const CORPS = {
  terme: 'Actif',
  pourquoi: 'Le mot dit le contraire de ce qu’il désigne.',
}

function requete(corps: unknown, entetes: Record<string, string> = {}): Request {
  return new Request('http://x/api/propositions', {
    method: 'POST',
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Vitest', ...entetes },
  })
}

describe('POST /api/propositions', () => {
  beforeEach(() => {
    depotCourant = depotEnMemoire()
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('SEL_VOTES', 'sel-de-test')
  })

  it('répond 201 et enregistre la proposition', async () => {
    const r = await POST(requete(CORPS))
    expect(r.status).toBe(201)
    const texte = await r.text()
    // Rien de ce qui a été saisi ne repart vers le client.
    expect(texte).not.toContain(CORPS.pourquoi)
    expect(await depotCourant.nonTraitees()).toMatchObject([{ terme: 'Actif', pourquoi: CORPS.pourquoi }])
  })

  it('accepte un POST de même origine', async () => {
    const r = await POST(requete(CORPS, { 'sec-fetch-site': 'same-origin' }))
    expect(r.status).toBe(201)
  })

  it('refuse un POST d’origine extérieure, et n’écrit rien', async () => {
    const r = await POST(requete(CORPS, { 'sec-fetch-site': 'cross-site' }))
    expect(r.status).toBe(403)
    expect(await depotCourant.nonTraitees()).toEqual([])
  })

  it('répond 400 pour un corps qui n’est pas du JSON', async () => {
    const r = await POST(requete('pas du json'))
    expect(r.status).toBe(400)
  })

  it('répond 400 avec la liste des champs fautifs', async () => {
    const r = await POST(requete({ terme: '', pourquoi: 'court' }))
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({ erreur: 'invalide', champs: ['terme', 'pourquoi'] })
  })

  it('répond 400 à un caractère de contrôle, sans rien écrire', async () => {
    for (const terme of ['Act\u0000if', 'Actif\x1b[2J']) {
      const r = await POST(requete({ ...CORPS, terme }))
      expect(r.status).toBe(400)
      expect(await r.json()).toEqual({ erreur: 'invalide', champs: ['terme'] })
    }
    expect(await depotCourant.nonTraitees()).toEqual([])
  })

  it('stocke \\r\\n en \\n et garde \\t', async () => {
    const r = await POST(requete({ ...CORPS, pourquoi: `${CORPS.pourquoi}\r\n\tsuite` }))
    expect(r.status).toBe(201)
    expect(await depotCourant.nonTraitees()).toMatchObject([{ pourquoi: `${CORPS.pourquoi}\n\tsuite` }])
  })

  it('répond comme un succès au piège, sans rien écrire', async () => {
    // Un code différent apprendrait au robot que le champ `site` le trahit.
    const r = await POST(requete({ ...CORPS, site: 'http://spam' }))
    expect(r.status).toBe(201)
    expect(await depotCourant.nonTraitees()).toEqual([])
  })

  it('répond 429 à la 6e proposition dans l’heure', async () => {
    for (let i = 0; i < 5; i++) expect((await POST(requete(CORPS))).status).toBe(201)
    const r = await POST(requete(CORPS))
    expect(r.status).toBe(429)
    expect(await r.json()).toEqual({ erreur: 'trop' })
  })

  it('préfère x-real-ip à x-forwarded-for, que l’appelant peut forger', async () => {
    // Même `x-real-ip` à chaque fois : changer de `x-forwarded-for` ne doit pas
    // remettre le compteur à zéro.
    for (let i = 0; i < 5; i++) {
      await POST(requete(CORPS, { 'x-real-ip': '203.0.113.7', 'x-forwarded-for': `198.51.100.${i}` }))
    }
    const r = await POST(requete(CORPS, { 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.99' }))
    expect(r.status).toBe(429)
  })

  it('répond 503 sans jamais écrire quand le sel est absent', async () => {
    vi.stubEnv('SEL_VOTES', '')
    const r = await POST(requete(CORPS))
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ erreur: 'indisponible', cause: 'configuration' })
    expect(await depotCourant.nonTraitees()).toEqual([])
  })

  it('répond 503 sans détail quand la base échoue', async () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
    const panne = Object.assign(new Error(`relation absente sur ${CORPS.pourquoi}`), { code: '42P01' })
    depotCourant = { ...depotEnMemoire(), nombreDepuis: async () => Promise.reject(panne) }
    const r = await POST(requete(CORPS))
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ erreur: 'indisponible', cause: 'base' })
    // Seuls le nom de classe et le SQLSTATE sont journalisés, jamais le message.
    expect(espion).toHaveBeenCalledWith('propositions:', 'Error', '42P01')
    expect(JSON.stringify(espion.mock.calls)).not.toContain(CORPS.pourquoi)
    espion.mockRestore()
  })

  it('interdit la mise en cache de toute réponse, succès comme refus', async () => {
    const ok = await POST(requete(CORPS))
    expect(ok.headers.get('cache-control')).toBe('private, no-store')
    const refus = await POST(requete('pas du json'))
    expect(refus.headers.get('cache-control')).toBe('private, no-store')
    const origine = await POST(requete(CORPS, { 'sec-fetch-site': 'cross-site' }))
    expect(origine.headers.get('cache-control')).toBe('private, no-store')
  })
})

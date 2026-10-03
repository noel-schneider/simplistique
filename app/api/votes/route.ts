import { getFiche } from '@/lib/content/fiches'
import { codeHttp, configurationVotes, corpsDeReponse } from '@/lib/votes/configuration'
import { depotPostgres, executeurNeon } from '@/lib/votes/depot-postgres'
import { adresseDeLEnTete, empreinteVotant } from '@/lib/votes/empreintes'
import { annuler, lire, voter, type Issue } from '@/lib/votes/service'

/**
 * Lire `request.headers` suffit à rendre ce gestionnaire dynamique : Next cesse
 * le prérendu dès qu'une route accède aux données de la requête. Les douze
 * routes de pages restent donc générées au build ; celle-ci est la seule qui
 * tourne à chaud.
 */

function reponse(issue: Issue): Response {
  return Response.json(corpsDeReponse(issue), { status: codeHttp(issue) })
}

function indisponible(): Response {
  return Response.json({ erreur: 'indisponible' }, { status: 503 })
}

function contexte(request: Request) {
  const config = configurationVotes(process.env)
  if (!config) return null
  const votant = empreinteVotant(
    config.sel,
    adresseDeLEnTete(request.headers.get('x-forwarded-for')),
    request.headers.get('user-agent') ?? 'inconnu',
  )
  return { depot: depotPostgres(executeurNeon(config.url)), votant }
}

export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get('fiche')
  if (!slug) return Response.json({ erreur: 'fiche manquante' }, { status: 400 })

  const ctx = contexte(request)
  if (!ctx) return indisponible()

  const fiche = getFiche(slug)
  if (!fiche) return Response.json({ erreur: 'inconnu' }, { status: 404 })

  try {
    return reponse(await lire(ctx.depot, fiche, ctx.votant))
  } catch {
    return indisponible()
  }
}

async function cibleDuCorps(
  request: Request,
): Promise<{ fiche: string; alternative: string | null } | null> {
  try {
    const corps = await request.json()
    if (typeof corps?.fiche !== 'string') return null
    const alternative = corps.alternative
    if (alternative !== null && typeof alternative !== 'string') return null
    return { fiche: corps.fiche, alternative: alternative ?? null }
  } catch {
    return null
  }
}

async function ecrire(
  request: Request,
  action: typeof voter | typeof annuler,
): Promise<Response> {
  const cible = await cibleDuCorps(request)
  if (!cible) return Response.json({ erreur: 'corps invalide' }, { status: 400 })

  const ctx = contexte(request)
  if (!ctx) return indisponible()

  try {
    return reponse(await action(ctx.depot, cible, getFiche(cible.fiche), ctx.votant))
  } catch {
    return indisponible()
  }
}

export async function POST(request: Request): Promise<Response> {
  return ecrire(request, voter)
}

export async function DELETE(request: Request): Promise<Response> {
  return ecrire(request, annuler)
}

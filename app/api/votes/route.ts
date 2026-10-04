import { getFiche } from '@/lib/content/fiches'
import { codeHttp, configurationVotes, corpsDeReponse } from '@/lib/votes/configuration'
import { depotPostgres, executeurNeon } from '@/lib/votes/depot-postgres'
import { adresseDeLEnTete, empreinteVotant } from '@/lib/votes/empreintes'
import { annuler, lire, voter, type Issue } from '@/lib/votes/service'

/**
 * Le caractère dynamique de cette route ne doit pas dépendre du fait qu’elle lise
 * `request.headers` : une refonte qui cesserait de les lire la ferait pré-générer
 * en silence, avec les compteurs d’un seul visiteur figés au build.
 */
export const dynamic = 'force-dynamic'

const SANS_CACHE = { 'cache-control': 'private, no-store' }

function json(corps: unknown, status: number): Response {
  return Response.json(corps, { status, headers: SANS_CACHE })
}

function reponse(issue: Issue): Response {
  return json(corpsDeReponse(issue), codeHttp(issue))
}

function indisponible(cause: 'configuration' | 'base'): Response {
  return json({ erreur: 'indisponible', cause }, 503)
}

function journaliser(erreur: unknown): void {
  // Jamais `erreur.message` : un message de pilote peut porter un nom d’hôte, et
  // c’est par là qu’une chaîne de connexion fuirait. Le nom de la classe et le code
  // SQLSTATE sont des constantes : `42P01` dit « table absente, migration oubliée »,
  // `TypeError` dit « bug de programmation » — ce que le silence total avalait.
  console.error(
    'votes:',
    erreur instanceof Error ? erreur.constructor.name : 'inconnu',
    (erreur as { code?: string } | null)?.code ?? '',
  )
}

function contexte(request: Request) {
  const config = configurationVotes(process.env)
  if (!config) return null
  const votant = empreinteVotant(
    config.sel,
    // `x-real-ip` est posé par l’hébergeur et ne porte qu’une valeur, que l’appelant
    // ne contrôle pas. `x-forwarded-for` est une liste à laquelle un appelant peut
    // ajouter ce qu’il veut en tête : on ne s’y rabat que faute de mieux, en local.
    //
    // **Ce repli suppose que l’hébergeur pose toujours `x-real-ip` et écrase celui
    // du client.** C’est le cas de Vercel. Chez un hébergeur qui ne le poserait pas,
    // la déduplication et la limite de débit redeviendraient contournables : un
    // appelant forgerait un `x-forwarded-for` différent à chaque vote. C’est la seule
    // dépendance à l’hébergement de tout le projet, et elle est à vérifier le jour
    // d’une migration.
    //
    // `||` et non `??` : un `x-real-ip` présent mais vide est une chaîne vide, que
    // `??` prendrait pour une adresse valable — et tous les visiteurs partageraient
    // alors une seule empreinte.
    request.headers.get('x-real-ip') ||
      adresseDeLEnTete(request.headers.get('x-forwarded-for')),
    request.headers.get('user-agent') ?? 'inconnu',
  )
  return { depot: depotPostgres(executeurNeon(config.url)), votant }
}

export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get('fiche')
  if (!slug) return json({ erreur: 'fiche manquante' }, 400)

  try {
    const ctx = contexte(request)
    if (!ctx) return indisponible('configuration')

    const fiche = getFiche(slug)
    if (!fiche) return json({ erreur: 'inconnu' }, 404)

    return reponse(await lire(ctx.depot, fiche, ctx.votant))
  } catch (erreur) {
    journaliser(erreur)
    return indisponible('base')
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
  // `sec-fetch-site` est posé par le navigateur et non modifiable par la page qui
  // émet la requête : c’est ce qui distingue un clic sur une fiche d’un formulaire
  // hébergé ailleurs qui ferait voter ses visiteurs à leur insu. Absent (curl, vieux
  // navigateur), on laisse passer : la limite de débit et la déduplication restent.
  const origine = request.headers.get('sec-fetch-site')
  if (origine && origine !== 'same-origin') {
    return json({ erreur: 'origine refusée' }, 403)
  }

  const cible = await cibleDuCorps(request)
  if (!cible) return json({ erreur: 'corps invalide' }, 400)

  try {
    const ctx = contexte(request)
    if (!ctx) return indisponible('configuration')

    return reponse(await action(ctx.depot, cible, getFiche(cible.fiche), ctx.votant))
  } catch (erreur) {
    journaliser(erreur)
    return indisponible('base')
  }
}

export async function POST(request: Request): Promise<Response> {
  return ecrire(request, voter)
}

export async function DELETE(request: Request): Promise<Response> {
  return ecrire(request, annuler)
}

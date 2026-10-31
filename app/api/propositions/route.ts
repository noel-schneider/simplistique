import { depotPostgres } from '@/lib/propositions/depot-postgres'
import { soumettre, type IssueDeProposition } from '@/lib/propositions/service'
import { configurationVotes } from '@/lib/votes/configuration'
import { executeurNeon } from '@/lib/votes/depot-postgres'
import { adresseDeLEnTete, empreinteVotant } from '@/lib/votes/empreintes'

/**
 * Comme `/api/votes` : dynamique explicitement, pour qu’une refonte qui cesserait
 * de lire `request.headers` ne la fasse pas pré-générer en silence.
 */
export const dynamic = 'force-dynamic'

const SANS_CACHE = { 'cache-control': 'private, no-store' }

function json(corps: unknown, status: number): Response {
  return Response.json(corps, { status, headers: SANS_CACHE })
}

/**
 * Aucune réponse ne renvoie la proposition : le `contact` est une donnée
 * personnelle, et rien dans la réponse ne doit pouvoir le refléter. Le piège
 * arrive ici en `ok`, comme un vrai envoi — un code distinct trahirait le champ.
 */
function reponse(issue: IssueDeProposition): Response {
  switch (issue.type) {
    case 'ok':
      return json({ ok: true }, 201)
    case 'invalide':
      return json({ erreur: 'invalide', champs: issue.champs }, 400)
    case 'trop':
      return json({ erreur: 'trop' }, 429)
  }
}

function indisponible(cause: 'configuration' | 'base'): Response {
  return json({ erreur: 'indisponible', cause }, 503)
}

function journaliser(erreur: unknown): void {
  // Jamais `erreur.message` : il peut porter un nom d’hôte, donc la chaîne de
  // connexion — et ici, en plus, une valeur du corps reprise par le pilote dans son
  // message, `contact` compris. Nom de classe et SQLSTATE sont des constantes.
  console.error(
    'propositions:',
    erreur instanceof Error ? erreur.constructor.name : 'inconnu',
    (erreur as { code?: string } | null)?.code ?? '',
  )
}

function contexte(request: Request) {
  const config = configurationVotes(process.env)
  if (!config) return null
  const auteur = empreinteVotant(
    config.sel,
    // Même repli que `/api/votes`, pour les mêmes raisons (voir le commentaire
    // détaillé là-bas) : `x-real-ip` posé par l’hébergeur d’abord, `x-forwarded-for`
    // que l’appelant peut forger seulement faute de mieux, et `||` pour qu’un
    // `x-real-ip` vide ne fasse pas partager une seule empreinte à tout le monde.
    request.headers.get('x-real-ip') || adresseDeLEnTete(request.headers.get('x-forwarded-for')),
    request.headers.get('user-agent') ?? 'inconnu',
  )
  return { depot: depotPostgres(executeurNeon(config.url)), auteur }
}

async function corpsJson(request: Request): Promise<{ corps: unknown } | null> {
  try {
    return { corps: await request.json() }
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<Response> {
  // `sec-fetch-site` est posé par le navigateur, hors de portée de la page qui émet
  // la requête : il écarte un formulaire hébergé ailleurs qui ferait proposer ses
  // visiteurs à leur insu. Absent (curl), on laisse passer : la limite reste.
  const origine = request.headers.get('sec-fetch-site')
  if (origine && origine !== 'same-origin') {
    return json({ erreur: 'origine refusée' }, 403)
  }

  const lu = await corpsJson(request)
  if (!lu) return json({ erreur: 'corps invalide' }, 400)

  try {
    const ctx = contexte(request)
    if (!ctx) return indisponible('configuration')

    return reponse(await soumettre(ctx.depot, lu.corps, ctx.auteur))
  } catch (erreur) {
    journaliser(erreur)
    return indisponible('base')
  }
}

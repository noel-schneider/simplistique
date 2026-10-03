import { describe, expect, it } from 'vitest'
import { routesNonPreGenerees, SEULE_ROUTE_DYNAMIQUE } from './verifier-statique'

// Forme réelle des deux manifestes du build, réduite à ce qui compte ici.
const ROUTES = {
  '/page': '/',
  '/contribuer/page': '/contribuer',
  '/fiches/[slug]/page': '/fiches/[slug]',
  '/sitemap.xml/route': '/sitemap.xml',
  '/api/votes/route': '/api/votes',
}
const PRE_GENEREES = ['/', '/contribuer', '/fiches/actif-comptabilite', '/sitemap.xml']
const PARAMETREES = ['/fiches/[slug]']

describe('routesNonPreGenerees', () => {
  it('ne laisse que la route d’API dans un build sain', () => {
    expect(
      routesNonPreGenerees({
        routesDeLApplication: ROUTES,
        preGenerees: PRE_GENEREES,
        parametrees: PARAMETREES,
      }),
    ).toEqual([SEULE_ROUTE_DYNAMIQUE])
  })

  it('dénonce une page qui a cessé d’être pré-générée', () => {
    expect(
      routesNonPreGenerees({
        routesDeLApplication: ROUTES,
        preGenerees: PRE_GENEREES.filter((route) => route !== '/contribuer'),
        parametrees: PARAMETREES,
      }),
    ).toEqual(['/api/votes', '/contribuer'])
  })

  it('dénonce une route paramétrée qui n’est plus énumérée au build', () => {
    // Le cas d’un `generateStaticParams` retiré : les fiches seraient alors rendues
    // à la demande, une par visite, et le corpus relu sur le disque à chaud.
    expect(
      routesNonPreGenerees({
        routesDeLApplication: ROUTES,
        preGenerees: PRE_GENEREES,
        parametrees: [],
      }),
    ).toEqual(['/api/votes', '/fiches/[slug]'])
  })

  it('ne se plaint de rien quand une fiche est ajoutée au corpus', () => {
    // Aucune liste de routes n’est écrite dans le vérificateur : ajouter une fiche
    // ne doit jamais demander de le mettre à jour.
    expect(
      routesNonPreGenerees({
        routesDeLApplication: ROUTES,
        preGenerees: [...PRE_GENEREES, '/fiches/une-nouvelle-fiche'],
        parametrees: PARAMETREES,
      }),
    ).toEqual([SEULE_ROUTE_DYNAMIQUE])
  })
})

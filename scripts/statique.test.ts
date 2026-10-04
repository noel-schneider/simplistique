import { describe, expect, it } from 'vitest'
import { anomaliesDuBuild, type Manifestes } from './statique'

// Formes recopiées d’un vrai `next build` de ce projet, réduites aux champs lus. Les
// valeurs — `initialRevalidateSeconds: false`, `compute: 'static'`, `fallback: false`,
// `srcRoute` — sont celles que Next produit réellement : un jeu d’essai inventé
// laisserait passer les dérives qu’on cherche justement à attraper.
const SAIN: Manifestes = {
  routesDeLApplication: {
    '/page': '/',
    '/contribuer/page': '/contribuer',
    '/fiches/[slug]/page': '/fiches/[slug]',
    '/sitemap.xml/route': '/sitemap.xml',
    '/api/votes/route': '/api/votes',
  },
  preGenerees: {
    '/': { initialRevalidateSeconds: false, compute: 'static', srcRoute: '/' },
    '/contribuer': { initialRevalidateSeconds: false, compute: 'static', srcRoute: '/contribuer' },
    '/fiches/actif-comptabilite': {
      initialRevalidateSeconds: false,
      compute: 'static',
      srcRoute: '/fiches/[slug]',
    },
    '/sitemap.xml': { initialRevalidateSeconds: false, compute: 'static', srcRoute: '/sitemap.xml' },
  },
  parametrees: { '/fiches/[slug]': { fallback: false } },
}

describe('anomaliesDuBuild', () => {
  it('ne signale rien sur un build sain', () => {
    expect(anomaliesDuBuild(SAIN)).toEqual([])
  })

  it('ne signale rien quand une fiche est ajoutée au corpus', () => {
    // Aucune liste de routes n’est écrite dans le vérificateur : ajouter une fiche
    // ne doit jamais demander de le mettre à jour.
    expect(
      anomaliesDuBuild({
        ...SAIN,
        preGenerees: {
          ...SAIN.preGenerees,
          '/fiches/une-nouvelle': {
            initialRevalidateSeconds: false,
            compute: 'static',
            srcRoute: '/fiches/[slug]',
          },
        },
      }),
    ).toEqual([])
  })

  it('dénonce une page qui a cessé d’être pré-générée', () => {
    const sansContribuer = { ...SAIN.preGenerees }
    delete sansContribuer['/contribuer']
    expect(anomaliesDuBuild({ ...SAIN, preGenerees: sansContribuer })).toEqual([
      '/contribuer n’est ni pré-générée ni énumérée au build',
    ])
  })

  it('dénonce une page qui se revalide, ce que `revalidate` produit', () => {
    // Forme réelle : `export const revalidate = 60` laisse la page dans `routes`,
    // et `next build` l’affiche encore comme statique. Seul ce champ la trahit.
    expect(
      anomaliesDuBuild({
        ...SAIN,
        preGenerees: {
          ...SAIN.preGenerees,
          '/contribuer': {
            initialRevalidateSeconds: 60,
            compute: 'static',
            srcRoute: '/contribuer',
          },
        },
      }),
    ).toEqual([
      '/contribuer se revalide toutes les 60 secondes au lieu d’être figée au build',
    ])
  })

  it('dénonce une route paramétrée qui accepte un slug inconnu', () => {
    // Forme réelle de `dynamicParams = true` : `fallback` cesse de valoir `false`.
    expect(
      anomaliesDuBuild({ ...SAIN, parametrees: { '/fiches/[slug]': { fallback: null } } }),
    ).toEqual(['/fiches/[slug] accepte des valeurs hors de celles du build (fallback : null)'])
  })

  it('dénonce une route paramétrée dont aucune valeur n’est pré-générée', () => {
    // Forme réelle d’un `generateStaticParams` qui rend une liste vide : la route
    // reste dans `dynamicRoutes`, et c’est l’absence d’enfants qui la trahit.
    const sansFiche = { ...SAIN.preGenerees }
    delete sansFiche['/fiches/actif-comptabilite']
    expect(anomaliesDuBuild({ ...SAIN, preGenerees: sansFiche })).toEqual([
      '/fiches/[slug] n’a aucune page pré-générée : son énumération au build est vide',
    ])
  })

  it('dénonce une seconde route rendue à la demande', () => {
    expect(
      anomaliesDuBuild({
        ...SAIN,
        routesDeLApplication: { ...SAIN.routesDeLApplication, '/api/autre/route': '/api/autre' },
      }),
    ).toEqual(['/api/autre n’est ni pré-générée ni énumérée au build'])
  })
})

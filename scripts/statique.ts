/**
 * La contrainte la plus répétée du projet — chaque page est générée au build — ne
 * tenait jusqu’ici qu’à la lecture, par un humain, de la sortie de `next build`, à
 * chaque tâche. Une régression s’y glisserait sans bruit, et le site deviendrait une
 * application rendue à la demande sans que rien ne le dise.
 *
 * Ce module analyse les manifestes du build et ne touche à rien : il suit le partage
 * de `scripts/coherence.ts`, pur et testé, face à `scripts/lint-content.ts`, qui lit
 * le disque et affiche. Un module pur est indispensable ici : un test qui importerait
 * le point d’entrée déclencherait sa lecture de `.next`, et la suite de tests
 * échouerait sur une machine qui n’a pas encore construit le site — ce qui est
 * précisément le cas de l’intégration continue, où les tests passent avant le build.
 *
 * On n’analyse pas le texte de la sortie, qui change avec les versions de Next, et on
 * n’écrit ici aucune liste de routes : ajouter une fiche ou une page ne demande donc
 * aucune mise à jour de ce fichier.
 */
export const SEULE_ROUTE_DYNAMIQUE = '/api/votes'

/** Une entrée de `prerender-manifest.routes` : une page réellement pré-générée. */
export type RoutePreGeneree = {
  /** `false` quand la page est figée au build ; un nombre dès qu’elle se revalide. */
  initialRevalidateSeconds?: number | false
  /** `'static'` au build ; autre chose dès qu’un calcul a lieu à la demande. */
  compute?: string
  /** La route paramétrée dont cette page est une valeur concrète, s’il y en a une. */
  srcRoute?: string | null
}

/** Une entrée de `prerender-manifest.dynamicRoutes` : une route paramétrée. */
export type RouteParametree = {
  /**
   * `false` signifie « aucune valeur hors de celles énumérées au build », ce que
   * produit `export const dynamicParams = false`. Toute autre valeur rend un slug
   * inconnu à la demande, et le corpus serait alors relu sur le disque à chaud.
   */
  fallback?: string | false | null
}

export type Manifestes = {
  /** `app-path-routes-manifest.json` : chemin de fichier vers route publique. */
  routesDeLApplication: Record<string, string>
  /** `prerender-manifest.json`, champ `routes`. */
  preGenerees: Record<string, RoutePreGeneree>
  /** `prerender-manifest.json`, champ `dynamicRoutes`. */
  parametrees: Record<string, RouteParametree>
}

/**
 * Rend une anomalie par ligne, vide si le build est sain. Quatre familles, et chacune
 * correspond à une dérive observée sur un vrai build :
 *
 * 1. une route de l’application qui n’est ni pré-générée ni paramétrée — une page qui
 *    lit une donnée de requête, ou une seconde route d’API ;
 * 2. une page pré-générée qui se revalide, ce que produit `export const revalidate` :
 *    elle est alors rendue côté serveur à intervalle, et `next build` l’affiche encore
 *    comme statique ;
 * 3. une route paramétrée dont `fallback` n’est pas `false`, ce que produit
 *    `dynamicParams = true` : un slug inconnu est rendu à la demande ;
 * 4. une route paramétrée dont aucune valeur concrète n’est pré-générée, ce que produit
 *    un `generateStaticParams` qui rend une liste vide. Appartenir à `dynamicRoutes`
 *    ne prouve rien : c’est la présence d’enfants dans `routes` qui le prouve.
 */
export function anomaliesDuBuild({
  routesDeLApplication,
  preGenerees,
  parametrees,
}: Manifestes): string[] {
  const anomalies: string[] = []
  const connues = new Set([...Object.keys(preGenerees), ...Object.keys(parametrees)])

  for (const route of Object.values(routesDeLApplication).sort()) {
    if (route === SEULE_ROUTE_DYNAMIQUE || connues.has(route)) continue
    anomalies.push(`${route} n’est ni pré-générée ni énumérée au build`)
  }

  for (const [route, details] of Object.entries(preGenerees).sort()) {
    if (details.initialRevalidateSeconds !== false) {
      anomalies.push(
        `${route} se revalide toutes les ${details.initialRevalidateSeconds} secondes au lieu d’être figée au build`,
      )
    }
    if (details.compute !== undefined && details.compute !== 'static') {
      anomalies.push(`${route} est calculée « ${details.compute} » et non « static »`)
    }
  }

  for (const [route, details] of Object.entries(parametrees).sort()) {
    if (details.fallback !== false) {
      anomalies.push(
        `${route} accepte des valeurs hors de celles du build (fallback : ${JSON.stringify(details.fallback)})`,
      )
    }
    const enfants = Object.values(preGenerees).filter((page) => page.srcRoute === route)
    if (enfants.length === 0) {
      anomalies.push(`${route} n’a aucune page pré-générée : son énumération au build est vide`)
    }
  }

  return anomalies
}

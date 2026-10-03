import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * La contrainte la plus répétée du projet — chaque page est générée au build — ne
 * tenait jusqu’ici qu’à la lecture, par un humain, de la sortie de `next build`, à
 * chaque tâche. Une régression s’y glisserait sans bruit : il suffirait qu’une page
 * lise une donnée de requête pour qu’elle cesse d’être pré-générée, et le site
 * deviendrait une application rendue à la demande sans que rien ne le dise.
 *
 * On ne lit pas le texte de la sortie, qui change avec les versions de Next, mais les
 * deux manifestes du build. Aucune liste de routes n’est écrite ici : ajouter une
 * fiche ou une page ne demande donc aucune mise à jour de ce vérificateur.
 */
export const SEULE_ROUTE_DYNAMIQUE = '/api/votes'

type Manifestes = {
  /** `app-path-routes-manifest.json` : chemin de fichier vers route publique. */
  routesDeLApplication: Record<string, string>
  /** `prerender-manifest.json`, clés de `routes` : ce qui est réellement pré-généré. */
  preGenerees: string[]
  /** Clés de `dynamicRoutes` : les routes paramétrées énumérées au build. */
  parametrees: string[]
}

export function routesNonPreGenerees({
  routesDeLApplication,
  preGenerees,
  parametrees,
}: Manifestes): string[] {
  const connues = new Set([...preGenerees, ...parametrees])
  return Object.values(routesDeLApplication)
    .filter((route) => !connues.has(route))
    .sort()
}

function lireManifeste(nom: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), '.next', nom), 'utf8')) as Record<
    string,
    unknown
  >
}

function principal(): void {
  const prerender = lireManifeste('prerender-manifest.json')
  const restantes = routesNonPreGenerees({
    routesDeLApplication: lireManifeste('app-path-routes-manifest.json') as Record<string, string>,
    preGenerees: Object.keys((prerender.routes ?? {}) as Record<string, unknown>),
    parametrees: Object.keys((prerender.dynamicRoutes ?? {}) as Record<string, unknown>),
  })

  if (restantes.length === 1 && restantes[0] === SEULE_ROUTE_DYNAMIQUE) {
    console.log(
      `Le site reste statique : ${SEULE_ROUTE_DYNAMIQUE} est la seule route rendue à la demande.`,
    )
    return
  }

  console.error('Les routes rendues à la demande ne sont plus celles attendues.')
  console.error(`  attendu : ${SEULE_ROUTE_DYNAMIQUE}`)
  console.error(`  trouvé  : ${restantes.join(', ') || '(aucune)'}`)
  console.error('Une page qui cesse d’être pré-générée lit probablement une donnée de requête.')
  process.exitCode = 1
}

principal()

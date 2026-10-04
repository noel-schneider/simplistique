import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { anomaliesDuBuild, SEULE_ROUTE_DYNAMIQUE, type Manifestes } from './statique'

function lireManifeste(nom: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), '.next', nom), 'utf8')) as Record<
    string,
    unknown
  >
}

function principal(): void {
  if (!existsSync(join(process.cwd(), '.next', 'prerender-manifest.json'))) {
    console.error('Aucun build à vérifier. Lancez d’abord `npm run build`.')
    process.exitCode = 1
    return
  }

  const prerender = lireManifeste('prerender-manifest.json')
  const anomalies = anomaliesDuBuild({
    routesDeLApplication: lireManifeste('app-path-routes-manifest.json') as Record<string, string>,
    preGenerees: (prerender.routes ?? {}) as Manifestes['preGenerees'],
    parametrees: (prerender.dynamicRoutes ?? {}) as Manifestes['parametrees'],
  })

  if (anomalies.length === 0) {
    console.log(
      `Le site reste statique : ${SEULE_ROUTE_DYNAMIQUE} est la seule route rendue à la demande.`,
    )
    return
  }

  console.error('Le site a cessé d’être entièrement généré au build :')
  for (const anomalie of anomalies) console.error(`  ${anomalie}`)
  process.exitCode = 1
}

principal()

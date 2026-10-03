// Adresse de base du site, résolue dans cet ordre :
//
// 1. `NEXT_PUBLIC_URL_SITE` — à régler explicitement sur l'hébergement une
//    fois l'adresse de production connue.
// 2. `VERCEL_PROJECT_PRODUCTION_URL` — fournie automatiquement par Vercel,
//    sans le protocole ; préfixée de `https://` ici.
// 3. `http://localhost:3000` — le serveur de développement.
//
// Le site n'est pas encore déployé : aucune adresse de production n'est
// inventée ici, seulement cette résolution.
export function urlSite(): string {
  if (process.env.NEXT_PUBLIC_URL_SITE) return process.env.NEXT_PUBLIC_URL_SITE
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

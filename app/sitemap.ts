import type { MetadataRoute } from 'next'
import { getFiches } from '@/lib/content/fiches'
import { urlSite } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlSite()
  const fiches = getFiches()

  const pagesStatiques: MetadataRoute.Sitemap = ['/', '/manifeste', '/fiches', '/contribuer'].map(
    (chemin) => ({
      url: `${base}${chemin}`,
      lastModified: new Date(),
    }),
  )

  const pagesFiches: MetadataRoute.Sitemap = fiches.map((fiche) => ({
    url: `${base}/fiches/${fiche.slug}`,
    lastModified: fiche.modifie,
  }))

  return [...pagesStatiques, ...pagesFiches]
}

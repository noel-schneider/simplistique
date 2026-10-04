import type { MetadataRoute } from 'next'
import { urlSite } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${urlSite()}/sitemap.xml`,
  }
}

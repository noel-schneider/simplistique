import { ImageResponse } from 'next/og'
import { getFiche, getFiches } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'
import { contenuImagePartage } from '@/lib/partage'

export const alt = 'Image de partage de la fiche'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Même liste que la page de fiche : une image par fiche, produite au build.
export function generateStaticParams() {
  return getFiches().map((fiche) => ({ slug: fiche.slug }))
}

// Police système (par défaut de next/og) : aucun chargement réseau au build.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const taxonomies = chargerTaxonomies()
  const fiche = getFiche((await params).slug, undefined, taxonomies)
  if (!fiche) throw new Error('Fiche introuvable pour l’image de partage')
  const nomDiscipline =
    taxonomies.disciplines.find((d) => d.slug === fiche.discipline)?.nom ?? fiche.discipline
  const { titre, phrase, pied } = contenuImagePartage(fiche, nomDiscipline)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#fafaf9',
          color: '#1c1917',
        }}
      >
        <div style={{ display: 'flex', fontSize: 110, fontWeight: 700, lineHeight: 1.1 }}>{titre}</div>
        <div style={{ display: 'flex', fontSize: 44, lineHeight: 1.3, color: '#44403c' }}>{phrase}</div>
        <div style={{ display: 'flex', fontSize: 32, color: '#78716c' }}>{pied}</div>
      </div>
    ),
    { ...size },
  )
}

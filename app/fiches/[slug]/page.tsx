import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EnteteFiche } from '@/components/entete-fiche'
import { Prose } from '@/components/prose'
import { getFiche, getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getFiches().map((fiche) => ({ slug: fiche.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const fiche = getFiche((await params).slug)
  if (!fiche) return {}
  return { title: fiche.terme, description: fiche.resume }
}

function nomDe(entrees: { slug: string; nom: string }[], slug: string): string {
  return entrees.find((e) => e.slug === slug)?.nom ?? slug
}

export default async function PageFiche({ params }: Params) {
  const taxonomies = chargerTaxonomies()
  const fiche = getFiche((await params).slug, undefined, taxonomies)
  if (!fiche) notFound()

  return (
    <article>
      <EnteteFiche
        fiche={fiche}
        nomDiscipline={nomDe(taxonomies.disciplines, fiche.discipline)}
        nomConfusion={nomDe(taxonomies.confusions, fiche.confusion)}
        nomStatut={nomDe(taxonomies.statuts, fiche.statut)}
      />
      <Prose html={await rendreMarkdown(fiche.corps)} />
    </article>
  )
}

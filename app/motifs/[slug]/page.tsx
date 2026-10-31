import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeStatut } from '@/components/badge-statut'
import { Prose } from '@/components/prose'
import { getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { getMotif, getMotifs } from '@/lib/content/motifs'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

// `generateMetadata` et le composant sont deux invocations distinctes pour le
// même motif ; `cache` mémoïse les taxonomies pour la durée du rendu.
const taxonomiesDeLaRequete = cache(() => chargerTaxonomies())

// Sans cela, un slug absent de la liste ci-dessous déclencherait un rendu à la
// demande, ce que la contrainte « chaque page est générée au build » interdit.
export const dynamicParams = false

export function generateStaticParams() {
  return getMotifs().map((motif) => ({ slug: motif.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const motif = getMotif((await params).slug)
  if (!motif) return {}
  return {
    title: motif.nom,
    description: motif.resume,
    openGraph: { title: motif.nom, description: motif.resume, type: 'article' },
  }
}

export default async function PageMotif({ params }: Params) {
  const taxonomies = taxonomiesDeLaRequete()
  const motif = getMotif((await params).slug)
  if (!motif) notFound()

  const nomDe = (entrees: { slug: string; nom: string }[], slug: string) =>
    entrees.find((e) => e.slug === slug)?.nom ?? slug

  const fiches = getFiches(undefined, taxonomies).filter((fiche) =>
    fiche.motifs.includes(motif.slug),
  )

  return (
    <article>
      <header className="mb-8 space-y-4 border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{motif.nom}</h1>
        <p className="text-lg leading-relaxed text-stone-700">{motif.resume}</p>
      </header>

      <Prose html={await rendreMarkdown(motif.corps)} />

      {/* La liste vient après le texte : on descend du piège général vers les
          cas, jamais l’inverse. */}
      <section className="mt-8 space-y-3 border-t border-stone-200 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Les fiches de ce motif</h2>
        {fiches.map((fiche) => (
          <div key={fiche.slug} className="space-y-1">
            <p className="flex flex-wrap items-center gap-3">
              <Link
                href={`/fiches/${fiche.slug}`}
                className="font-medium underline hover:text-stone-600"
              >
                {fiche.terme}
              </Link>
              <span className="text-sm text-stone-500">
                {nomDe(taxonomies.disciplines, fiche.discipline)}
              </span>
              <BadgeStatut statut={fiche.statut} nom={nomDe(taxonomies.statuts, fiche.statut)} />
            </p>
            <p className="text-sm text-stone-600">{fiche.resume}</p>
          </div>
        ))}
      </section>
    </article>
  )
}

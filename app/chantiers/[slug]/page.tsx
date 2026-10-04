import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeStatut } from '@/components/badge-statut'
import { Prose } from '@/components/prose'
import { getChantier, getChantiers } from '@/lib/content/chantiers'
import { getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

// Même raison que pour la page d’une fiche : `generateMetadata` et le composant
// sont deux invocations distinctes pour le même chantier, et chacune a besoin
// des taxonomies. `cache` les mémoïse pour la durée du rendu de cette route.
const taxonomiesDeLaRequete = cache(() => chargerTaxonomies())

// Sans cela, un slug absent de la liste ci-dessous déclencherait un rendu à la
// demande. La contrainte globale « chaque page est générée au build » l’interdit.
export const dynamicParams = false

export function generateStaticParams() {
  return getChantiers().map((chantier) => ({ slug: chantier.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const chantier = getChantier((await params).slug, undefined, taxonomiesDeLaRequete())
  if (!chantier) return {}
  return {
    title: chantier.nom,
    description: chantier.resume,
    openGraph: { title: chantier.nom, description: chantier.resume, type: 'article' },
  }
}

export default async function PageChantier({ params }: Params) {
  const taxonomies = taxonomiesDeLaRequete()
  const chantier = getChantier((await params).slug, undefined, taxonomies)
  if (!chantier) notFound()

  const nomDiscipline =
    taxonomies.disciplines.find((d) => d.slug === chantier.discipline)?.nom ?? chantier.discipline
  const nomStatut = (slug: string) =>
    taxonomies.statuts.find((s) => s.slug === slug)?.nom ?? slug

  const fiches = getFiches(undefined, taxonomies).filter(
    (fiche) => fiche.chantier === chantier.slug,
  )

  return (
    <article>
      <header className="mb-8 space-y-4 border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{chantier.nom}</h1>
        <p className="text-lg leading-relaxed text-stone-700">{chantier.resume}</p>
        <Link
          href={`/fiches?discipline=${chantier.discipline}`}
          className="text-sm text-stone-600 underline hover:text-stone-900"
        >
          {nomDiscipline}
        </Link>
      </header>

      <Prose html={await rendreMarkdown(chantier.corps)} />

      {/* La liste vient après le texte : on descend de l’argument d’ensemble
          vers les cas particuliers, jamais l’inverse. */}
      <section className="mt-8 space-y-3 border-t border-stone-200 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {fiches.length === 1 ? 'Le terme de ce chantier' : 'Les termes de ce chantier'}
        </h2>
        {fiches.length === 0 ? (
          <p className="text-sm text-stone-500">
            Aucune fiche ne désigne encore ce chantier.
          </p>
        ) : (
          fiches.map((fiche) => (
            <div key={fiche.slug} className="space-y-1">
              <p className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/fiches/${fiche.slug}`}
                  className="font-medium underline hover:text-stone-600"
                >
                  {fiche.terme}
                </Link>
                <BadgeStatut statut={fiche.statut} nom={nomStatut(fiche.statut)} />
              </p>
              <p className="text-sm text-stone-600">{fiche.resume}</p>
            </div>
          ))
        )}
      </section>
    </article>
  )
}

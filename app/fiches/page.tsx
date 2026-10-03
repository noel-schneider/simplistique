import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Corpus } from '@/components/corpus'
import { getIndex } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

export const metadata: Metadata = { title: 'Fiches' }

export default function PageFiches() {
  const { disciplines, confusions, statuts } = chargerTaxonomies()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Les fiches</h1>
      <Suspense fallback={<p className="text-stone-500">Chargement du corpus…</p>}>
        <Corpus
          index={getIndex()}
          disciplines={disciplines}
          confusions={confusions}
          statuts={statuts}
        />
      </Suspense>
      <noscript>
        <ul className="space-y-1 text-sm">
          {getIndex().map((fiche) => (
            <li key={fiche.slug}>
              <a href={`/fiches/${fiche.slug}`} className="underline">
                {fiche.terme}
              </a>{' '}
              <span className="text-stone-500">— {fiche.resume}</span>
            </li>
          ))}
        </ul>
      </noscript>
    </div>
  )
}

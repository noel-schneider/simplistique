import Link from 'next/link'
import { getIndex } from '@/lib/content/fiches'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

export default function Accueil() {
  const fiches = getIndex()
  const disciplines = chargerTaxonomies().disciplines

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">La simplistique</h1>
      <p className="text-lg leading-relaxed text-stone-700">
        Une discipline qui cherche à simplifier les autres disciplines par le langage. Elle n’apporte
        pas de connaissance nouvelle : elle rend accessible celle qui existe déjà.
      </p>
      <p className="leading-relaxed text-stone-700">
        {fiches.length} terme{fiches.length > 1 ? 's' : ''} analysé{fiches.length > 1 ? 's' : ''} dans{' '}
        {disciplines.length} discipline{disciplines.length > 1 ? 's' : ''}.
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          href="/fiches"
          className="rounded bg-stone-900 px-4 py-2 text-sm text-stone-50 hover:bg-stone-700"
        >
          Parcourir les fiches
        </Link>
        <Link
          href="/manifeste"
          className="rounded border border-stone-300 px-4 py-2 text-sm hover:border-stone-500"
        >
          Lire le manifeste
        </Link>
      </div>
    </div>
  )
}

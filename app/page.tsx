import Link from 'next/link'
import { getIndex } from '@/lib/content/fiches'
import { fichesALaUne } from '@/lib/accueil'
import { chargerTaxonomies } from '@/lib/content/taxonomies'
import { typographier } from '@/lib/typographie'

export default function Accueil() {
  const fiches = getIndex()
  const disciplines = chargerTaxonomies().disciplines
  const alaUne = fichesALaUne(fiches)
  const nomDiscipline = new Map(disciplines.map((d) => [d.slug, d.nom]))

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
        <Link
          href="/proposer"
          className="rounded border border-stone-300 px-4 py-2 text-sm hover:border-stone-500"
        >
          Proposer un terme
        </Link>
      </div>
      {alaUne.length > 0 && (
        <section aria-labelledby="a-la-une" className="space-y-3 pt-4">
          <h2 id="a-la-une" className="text-xl font-semibold tracking-tight">
            Ce qu’on croit comprendre
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {alaUne.map((fiche) => (
              <li key={fiche.slug} className="flex flex-col rounded border border-stone-200 p-4">
                <p className="flex-1 leading-relaxed text-stone-900">{fiche.accroche && typographier(fiche.accroche)}</p>
                <Link
                  href={`/fiches/${fiche.slug}`}
                  className="mt-3 text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900"
                >
                  {typographier(fiche.terme)}
                  <span className="text-stone-500"> · {nomDiscipline.get(fiche.discipline) ?? fiche.discipline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p>
        <Link href="/motifs" className="text-stone-700 underline underline-offset-2 hover:text-stone-900">
          Les pièges qui reviennent d’une discipline à l’autre
        </Link>
      </p>
    </div>
  )
}

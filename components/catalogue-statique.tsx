import Link from 'next/link'
import { BadgeStatut } from './badge-statut'
import type { Discipline, EntreeTaxonomie, FicheIndex } from '@/lib/content/schema'

// Contenu de secours du <Suspense> qui enveloppe <Corpus> dans
// app/fiches/page.tsx : à la différence de l’enveloppe elle-même, ce contenu
// EST rendu au build, puisqu’il n’appelle pas `useSearchParams()`. C’est donc
// lui qui porte le corpus dans le HTML statique livré — et, chez un visiteur
// sans JavaScript, il n’est jamais remplacé par <Corpus> : il reste le rendu
// final. Composant d’affichage pur : pas d’état, pas de filtre, pas de tri.
export function CatalogueStatique({
  index,
  disciplines,
  statuts,
}: {
  index: FicheIndex[]
  disciplines: Discipline[]
  statuts: EntreeTaxonomie[]
}) {
  const libellesDisciplines = new Map(disciplines.map((d) => [d.slug, d.nom]))
  const libellesStatuts = new Map(statuts.map((s) => [s.slug, s.nom]))

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        Voici le corpus complet des fiches ; les filtres apparaissent dès que l’interface
        interactive est chargée.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
              <th scope="col" className="py-2 pr-4 font-normal">
                Terme
              </th>
              <th scope="col" className="px-4 py-2 font-normal">
                Discipline
              </th>
              <th scope="col" className="px-4 py-2 font-normal">
                Statut
              </th>
              <th scope="col" className="py-2 font-normal">
                Suggestion
              </th>
            </tr>
          </thead>
          <tbody>
            {index.map((fiche) => (
              <tr key={fiche.slug} className="border-b border-stone-200 align-baseline">
                <td className="py-2 pr-4">
                  <Link href={`/fiches/${fiche.slug}`} className="font-medium underline">
                    {fiche.terme}
                  </Link>
                </td>
                <td className="px-4 py-2 text-stone-600">
                  {libellesDisciplines.get(fiche.discipline) ?? fiche.discipline}
                </td>
                <td className="px-4 py-2">
                  <BadgeStatut
                    statut={fiche.statut}
                    nom={libellesStatuts.get(fiche.statut) ?? fiche.statut}
                  />
                </td>
                <td className="py-2 text-stone-600">
                  {fiche.suggestions.length > 0 ? fiche.suggestions.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

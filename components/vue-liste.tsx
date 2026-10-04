'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BadgeStatut } from './badge-statut'
import { PastilleDemonstration } from './pastille-demonstration'
import type { FicheIndex } from '@/lib/content/schema'

export type Libelles = { disciplines: Map<string, string>; statuts: Map<string, string> }
export type Colonne = 'terme' | 'discipline' | 'statut'

const TRIABLES: { cle: Colonne; libelle: string }[] = [
  { cle: 'terme', libelle: 'Terme' },
  { cle: 'discipline', libelle: 'Discipline' },
  { cle: 'statut', libelle: 'Statut' },
]

export function trierFiches(
  fiches: FicheIndex[],
  colonne: Colonne,
  croissant: boolean,
  libelles: Libelles,
): FicheIndex[] {
  const valeur = (fiche: FicheIndex): string => {
    if (colonne === 'discipline') return libelles.disciplines.get(fiche.discipline) ?? fiche.discipline
    if (colonne === 'statut') return libelles.statuts.get(fiche.statut) ?? fiche.statut
    return fiche.terme
  }

  const triees = [...fiches].sort((a, b) => valeur(a).localeCompare(valeur(b), 'fr'))
  return croissant ? triees : triees.reverse()
}

export function VueListe({ fiches, libelles }: { fiches: FicheIndex[]; libelles: Libelles }) {
  const [tri, setTri] = useState<{ colonne: Colonne; croissant: boolean }>({
    colonne: 'terme',
    croissant: true,
  })

  function basculerTri(colonne: Colonne) {
    setTri((actuel) =>
      actuel.colonne === colonne
        ? { colonne, croissant: !actuel.croissant }
        : { colonne, croissant: true },
    )
  }

  const triees = trierFiches(fiches, tri.colonne, tri.croissant, libelles)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
            {TRIABLES.map(({ cle, libelle }, i) => (
              <th
                key={cle}
                scope="col"
                aria-sort={
                  tri.colonne === cle ? (tri.croissant ? 'ascending' : 'descending') : 'none'
                }
                className={`py-2 font-normal ${i === 0 ? 'pr-4' : 'px-4'}`}
              >
                <button
                  type="button"
                  onClick={() => basculerTri(cle)}
                  className="uppercase hover:text-stone-900"
                >
                  {libelle}
                </button>
              </th>
            ))}
            <th scope="col" className="py-2 font-normal">
              Suggestion
            </th>
          </tr>
        </thead>
        <tbody>
          {triees.map((fiche) => (
            <tr key={fiche.slug} className="border-b border-stone-200 align-baseline">
              <td className="py-2 pr-4">
                <Link href={`/fiches/${fiche.slug}`} className="font-medium underline">
                  {fiche.terme}
                </Link>
                {fiche.demonstration && <PastilleDemonstration />}
              </td>
              <td className="px-4 py-2 text-stone-600">
                {libelles.disciplines.get(fiche.discipline) ?? fiche.discipline}
              </td>
              <td className="px-4 py-2">
                <BadgeStatut
                  statut={fiche.statut}
                  nom={libelles.statuts.get(fiche.statut) ?? fiche.statut}
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
  )
}

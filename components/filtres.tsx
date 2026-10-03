'use client'

import type { Criteres } from '@/lib/filtrage'

type Groupe = { cle: 'disciplines' | 'confusions' | 'statuts'; libelle: string; entrees: { slug: string; nom: string }[] }

export function Filtres({
  criteres,
  groupes,
  onChange,
  onEffacer,
  filtreActif,
}: {
  criteres: Criteres
  groupes: Groupe[]
  onChange: (criteres: Criteres) => void
  onEffacer: () => void
  filtreActif: boolean
}) {
  function basculer(cle: Groupe['cle'], slug: string) {
    const actuels = criteres[cle]
    const suivants = actuels.includes(slug)
      ? actuels.filter((s) => s !== slug)
      : [...actuels, slug]

    onChange({ ...criteres, [cle]: suivants })
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        aria-label="Chercher un terme"
        placeholder="Chercher un terme…"
        value={criteres.q}
        onChange={(e) => onChange({ ...criteres, q: e.target.value })}
        className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
      />

      {groupes.map(({ cle, libelle, entrees }) => (
        <div key={cle} className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-stone-500">{libelle}</span>
          {entrees.map(({ slug, nom }) => {
            const actif = criteres[cle].includes(slug)
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={actif}
                onClick={() => basculer(cle, slug)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  actif ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300 text-stone-600'
                }`}
              >
                {nom}
              </button>
            )
          })}
        </div>
      ))}

      {filtreActif && (
        <button type="button" onClick={onEffacer} className="text-xs text-stone-500 underline">
          Effacer les filtres
        </button>
      )}
    </div>
  )
}

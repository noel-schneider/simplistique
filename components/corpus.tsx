'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { Discipline, EntreeTaxonomie, FicheIndex } from '@/lib/content/schema'
import {
  analyserCriteres,
  aUnFiltre,
  CRITERES_VIDES,
  ecrireCriteres,
  filtrerFiches,
  type Criteres,
} from '@/lib/filtrage'
import { Filtres } from './filtres'
import { VueListe, type Libelles } from './vue-liste'

export type Vue = 'carte' | 'liste'

const GRAND_ECRAN = '(min-width: 640px)'

export function vueParDefaut(): Vue {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'liste'
  return window.matchMedia(GRAND_ECRAN).matches ? 'carte' : 'liste'
}

export function Corpus({
  index,
  disciplines,
  confusions,
  statuts,
}: {
  index: FicheIndex[]
  disciplines: Discipline[]
  confusions: EntreeTaxonomie[]
  statuts: EntreeTaxonomie[]
}) {
  const router = useRouter()
  const chemin = usePathname()
  const params = useSearchParams()

  const valides = useMemo(
    () => ({
      disciplines: disciplines.map((d) => d.slug),
      confusions: confusions.map((c) => c.slug),
      statuts: statuts.map((s) => s.slug),
    }),
    [disciplines, confusions, statuts],
  )

  const vueDemandee = params.get('vue')
  const vueValide = vueDemandee === 'carte' || vueDemandee === 'liste' ? vueDemandee : null

  const [criteres, setCriteres] = useState<Criteres>(() =>
    analyserCriteres(new URLSearchParams(params.toString()), valides),
  )
  const [vue, setVue] = useState<Vue>(() => vueValide ?? vueParDefaut())
  const [vueExplicite, setVueExplicite] = useState(vueValide !== null)

  const libellesRecherche = useMemo(
    () => ({
      disciplines: new Map(disciplines.map((d) => [d.slug, d.nom])),
      confusions: new Map(confusions.map((c) => [c.slug, c.nom])),
    }),
    [disciplines, confusions],
  )

  const fiches = filtrerFiches(index, criteres, libellesRecherche)

  const libelles: Libelles = useMemo(
    () => ({
      disciplines: new Map(disciplines.map((d) => [d.slug, d.nom])),
      statuts: new Map(statuts.map((s) => [s.slug, s.nom])),
    }),
    [disciplines, statuts],
  )

  function naviguer(prochainsCriteres: Criteres, prochaineVue: Vue) {
    const explicite = vueExplicite || prochaineVue !== vue

    setCriteres(prochainsCriteres)
    setVue(prochaineVue)
    setVueExplicite(explicite)

    const requete = ecrireCriteres(prochainsCriteres, explicite ? prochaineVue : undefined)
    router.replace(requete ? `${chemin}?${requete}` : chemin, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded border border-stone-300 text-xs">
          {(['carte', 'liste'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vue === v}
              onClick={() => naviguer(criteres, v)}
              className={`px-3 py-1 capitalize ${vue === v ? 'bg-stone-900 text-stone-50' : 'text-stone-600'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-500">
          {`${fiches.length} fiche${fiches.length > 1 ? 's' : ''}${
            fiches.length === index.length ? '' : ` sur ${index.length}`
          }`}
        </p>
      </div>

      <Filtres
        criteres={criteres}
        filtreActif={aUnFiltre(criteres)}
        onChange={(c) => naviguer(c, vue)}
        onEffacer={() => naviguer(CRITERES_VIDES, vue)}
        groupes={[
          { cle: 'disciplines', libelle: 'Discipline', entrees: disciplines },
          { cle: 'confusions', libelle: 'Confusion', entrees: confusions },
          { cle: 'statuts', libelle: 'Statut', entrees: statuts },
        ]}
      />

      {fiches.length === 0 ? (
        <p className="py-10 text-center text-stone-500">
          Aucune fiche ne correspond à ces critères.
        </p>
      ) : (
        <VueListe fiches={fiches} libelles={libelles} />
      )}
    </div>
  )
}

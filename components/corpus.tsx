'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
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

  const requeteActuelle = params.toString()

  const [criteres, setCriteres] = useState<Criteres>(() =>
    analyserCriteres(new URLSearchParams(requeteActuelle), valides),
  )
  const [vue, setVue] = useState<Vue>(() => vueValide ?? vueParDefaut())
  const [vueExplicite, setVueExplicite] = useState(vueValide !== null)

  // La requête que NOUS avons écrite en dernier. Tout écart signifie que l’URL a
  // changé sans passer par `naviguer` — un lien interne vers /fiches depuis la
  // navigation du site, par exemple, qui laisse ce composant monté. Il faut alors
  // repartir de l’URL : sinon l’affichage garde des filtres que l’URL ne porte
  // plus, et la prochaine interaction les réécrirait dedans.
  const derniereRequeteEcrite = useRef(requeteActuelle)

  useEffect(() => {
    if (derniereRequeteEcrite.current === requeteActuelle) return
    derniereRequeteEcrite.current = requeteActuelle

    const prochains = new URLSearchParams(requeteActuelle)
    const demandee = prochains.get('vue')
    const valide = demandee === 'carte' || demandee === 'liste' ? demandee : null

    setCriteres(analyserCriteres(prochains, valides))
    setVue(valide ?? vueParDefaut())
    setVueExplicite(valide !== null)
  }, [requeteActuelle, valides])

  // Une seule construction des tables slug -> libellé, consommée à la fois par la
  // recherche et par l’affichage.
  const libellesParSlug = useMemo(
    () => ({
      disciplines: new Map(disciplines.map((d) => [d.slug, d.nom])),
      confusions: new Map(confusions.map((c) => [c.slug, c.nom])),
      statuts: new Map(statuts.map((s) => [s.slug, s.nom])),
    }),
    [disciplines, confusions, statuts],
  )

  const fiches = filtrerFiches(index, criteres, libellesParSlug)

  const libelles: Libelles = {
    disciplines: libellesParSlug.disciplines,
    statuts: libellesParSlug.statuts,
  }

  function naviguer(prochainsCriteres: Criteres, prochaineVue: Vue) {
    const explicite = vueExplicite || prochaineVue !== vue

    setCriteres(prochainsCriteres)
    setVue(prochaineVue)
    setVueExplicite(explicite)

    const requete = ecrireCriteres(prochainsCriteres, explicite ? prochaineVue : undefined)
    derniereRequeteEcrite.current = requete
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
        <p role="status" className="text-sm text-stone-500">
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

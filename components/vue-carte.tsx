import { STATUTS, type Discipline, type FicheIndex, type Statut } from '@/lib/content/schema'

const RAYON = 7
const PAS = 26
const COLONNES = 8

export function styleStatut(statut: Statut, couleur: string) {
  if (statut === 'propose') return { fill: couleur, stroke: couleur, fillOpacity: 1 }
  if (statut === 'rejete') return { fill: couleur, stroke: couleur, fillOpacity: 0.25 }
  return { fill: 'none', stroke: couleur, fillOpacity: 1 }
}

function Zone({
  discipline,
  fiches,
  libellesStatuts,
}: {
  discipline: Discipline
  fiches: FicheIndex[]
  libellesStatuts: Map<string, string>
}) {
  const lignes = Math.max(1, Math.ceil(fiches.length / COLONNES))
  const hauteur = lignes * PAS + RAYON * 2

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-sm"
          style={{ backgroundColor: discipline.couleur }}
        />
        <h3 className="text-xs uppercase tracking-wide text-stone-500">
          {`${discipline.nom} · ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`}
        </h3>
      </div>
      <svg
        role="presentation"
        viewBox={`0 0 ${COLONNES * PAS} ${hauteur}`}
        className="w-full"
        style={{ maxHeight: hauteur }}
      >
        {fiches.map((fiche, i) => {
          const style = styleStatut(fiche.statut, discipline.couleur)
          const nomStatut = libellesStatuts.get(fiche.statut) ?? fiche.statut
          return (
            <a
              key={fiche.slug}
              href={`/fiches/${fiche.slug}`}
              aria-label={`${fiche.terme} — ${nomStatut}`}
            >
              <title>{`${fiche.terme} — ${nomStatut}`}</title>
              <circle
                cx={(i % COLONNES) * PAS + PAS / 2}
                cy={Math.floor(i / COLONNES) * PAS + PAS / 2}
                r={RAYON}
                strokeWidth={2}
                {...style}
              />
            </a>
          )
        })}
      </svg>
    </section>
  )
}

export function VueCarte({
  fiches,
  disciplines,
  libellesStatuts,
}: {
  fiches: FicheIndex[]
  disciplines: Discipline[]
  libellesStatuts: Map<string, string>
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        {disciplines.map((discipline) => (
          <Zone
            key={discipline.slug}
            discipline={discipline}
            fiches={fiches.filter((f) => f.discipline === discipline.slug)}
            libellesStatuts={libellesStatuts}
          />
        ))}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200 pt-4 text-xs text-stone-500">
        {STATUTS.map((statut) => {
          const style = styleStatut(statut, '#78716c')
          return (
            <div key={statut} className="flex items-center gap-2">
              <svg width={18} height={18} aria-hidden="true">
                <circle cx={9} cy={9} r={RAYON} strokeWidth={2} {...style} />
              </svg>
              <dt>{libellesStatuts.get(statut) ?? statut}</dt>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

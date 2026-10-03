import Link from 'next/link'
import type { FicheMeta } from '@/lib/content/schema'
import { BadgeStatut } from './badge-statut'

function enFrancais(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function EnteteFiche({
  fiche,
  nomDiscipline,
  nomConfusion,
  nomStatut,
}: {
  fiche: FicheMeta
  nomDiscipline: string
  nomConfusion: string
  nomStatut: string
}) {
  return (
    <header className="mb-8 space-y-4 border-b border-stone-200 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight">{fiche.terme}</h1>
      <p className="text-lg leading-relaxed text-stone-700">{fiche.resume}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Link
          href={`/fiches?discipline=${fiche.discipline}`}
          className="text-stone-600 underline hover:text-stone-900"
        >
          {nomDiscipline}
        </Link>
        <Link
          href={`/fiches?confusion=${fiche.confusion}`}
          className="text-stone-600 underline hover:text-stone-900"
        >
          {nomConfusion}
        </Link>
        <BadgeStatut statut={fiche.statut} nom={nomStatut} />
      </div>

      <div className="text-sm">
        {fiche.suggestions.length === 0 ? (
          <p className="text-stone-500">Aucune alternative proposée à ce stade.</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-stone-500">
              Suggestion{fiche.suggestions.length > 1 ? 's' : ''} :
            </span>
            {fiche.suggestions.map((s) => (
              <span key={s} className="rounded bg-stone-200 px-2 py-0.5 font-medium">
                {s}
              </span>
            ))}
          </p>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Modifiée le{' '}
        <time dateTime={fiche.modifie.toISOString().slice(0, 10)}>{enFrancais(fiche.modifie)}</time>
      </p>
    </header>
  )
}

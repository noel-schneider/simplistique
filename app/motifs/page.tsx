import type { Metadata } from 'next'
import Link from 'next/link'
import { getFiches } from '@/lib/content/fiches'
import { getMotifs } from '@/lib/content/motifs'

export const metadata: Metadata = {
  title: 'Motifs',
  description:
    'Les pièges de vocabulaire qui reviennent d’une discipline à l’autre : un même mot trompeur, plusieurs fiches.',
}

export default function PageMotifs() {
  const motifs = getMotifs()
  const fiches = getFiches()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Les motifs</h1>
      <p className="leading-relaxed text-stone-700">
        Un motif est un piège de vocabulaire qui revient dans plusieurs disciplines : le même
        glissement de sens, sous des mots différents. Chaque motif réunit les fiches qui
        l’illustrent.
      </p>
      <ul className="space-y-5">
        {motifs.map((motif) => {
          const nombre = fiches.filter((fiche) => fiche.motifs.includes(motif.slug)).length
          return (
            <li key={motif.slug} className="space-y-1">
              <p className="flex flex-wrap items-baseline gap-3">
                <Link
                  href={`/motifs/${motif.slug}`}
                  className="text-lg font-medium underline hover:text-stone-600"
                >
                  {motif.nom}
                </Link>
                <span className="text-sm text-stone-500">
                  {nombre} fiche{nombre > 1 ? 's' : ''}
                </span>
              </p>
              <p className="text-sm text-stone-600">{motif.resume}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

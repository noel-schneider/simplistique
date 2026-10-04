import Link from 'next/link'

/**
 * Affiché en haut d’une fiche rattachée, avant son corps. La position est une
 * exigence de la spec : le lecteur doit savoir que le mot ne se renomme pas seul
 * AVANT de lire les suggestions, sinon l’avertissement arrive quand il s’est
 * déjà fait un avis.
 */
export function BandeauChantier({ slug, nom }: { slug: string; nom: string }) {
  return (
    <aside className="mb-8 rounded border border-stone-300 bg-stone-100 px-4 py-3 text-sm">
      <p className="text-stone-700">
        Ce terme ne se renomme pas seul : il fait partie d’une réforme plus large, le
        chantier{' '}
        <Link href={`/chantiers/${slug}`} className="font-medium underline hover:text-stone-900">
          {nom}
        </Link>
        .
      </p>
    </aside>
  )
}

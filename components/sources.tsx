import type { Source } from '@/lib/content/schema'

export function Sources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null

  return (
    <section aria-labelledby="sources" className="mt-10 border-t border-stone-200 pt-6">
      <h2 id="sources" className="text-lg font-semibold tracking-tight">
        Sources
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-stone-700">
        {sources.map((source) => (
          <li key={`${source.auteur}-${source.annee}-${source.titre}`}>
            {source.auteur} ({source.annee}),{' '}
            {source.url ? (
              <a href={source.url} className="underline hover:text-stone-900">
                {source.titre}
              </a>
            ) : (
              source.titre
            )}
            {source.lecture === 'seconde-main' && (
              <span className="ml-2 text-xs text-stone-500">(lue de seconde main)</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

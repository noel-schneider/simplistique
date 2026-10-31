import type { Precedent } from '@/lib/content/schema'

export function Precedents({ precedents }: { precedents: Precedent[] }) {
  if (precedents.length === 0) return null

  return (
    <aside aria-labelledby="precedents" className="mt-6 rounded-md border border-stone-200 bg-stone-50 p-4">
      <h2 id="precedents" className="text-sm font-semibold tracking-tight">
        Déjà fait ailleurs
      </h2>
      <ul className="mt-2 space-y-1 text-sm text-stone-700">
        {precedents.map((precedent) => (
          <li key={`${precedent.lieu}-${precedent.annee}`}>
            {precedent.lieu}, {precedent.annee} — {precedent.description}
          </li>
        ))}
      </ul>
    </aside>
  )
}

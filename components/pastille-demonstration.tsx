/**
 * Marque un terme fictif dans les listes, où le bandeau de la fiche n’est pas
 * visible. Sans elle, le catalogue mélangerait à l’œil les analyses réelles et
 * celles écrites pour développer le site.
 */
export function PastilleDemonstration() {
  return (
    <span className="ml-2 rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-900">
      démo
    </span>
  )
}

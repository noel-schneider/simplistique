import type { Preuve } from '@/lib/content/schema'

// Table exhaustive, comme CLASSES dans badge-statut.tsx : un quatrième niveau
// de preuve empêche la compilation au lieu de s’afficher sans style.
const CLASSES: Record<Preuve, string> = {
  intuition: 'border-stone-400 text-stone-600',
  documentee: 'border-sky-600 text-sky-700',
  mesuree: 'border-violet-600 text-violet-700',
}

export function BadgePreuve({ preuve, nom }: { preuve: Preuve; nom: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${CLASSES[preuve]}`}>{nom}</span>
  )
}

import type { Statut } from '@/lib/content/schema'

const CLASSES: Record<Statut, string> = {
  pointe: 'border-amber-500 text-amber-700',
  propose: 'border-emerald-600 text-emerald-700',
  rejete: 'border-stone-400 text-stone-500',
}

export function BadgeStatut({ statut, nom }: { statut: Statut; nom: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${CLASSES[statut]}`}>{nom}</span>
  )
}

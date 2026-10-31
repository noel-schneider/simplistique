import type { Metadata } from 'next'
import { FormulaireProposition } from '@/components/formulaire-proposition'

export const metadata: Metadata = {
  title: 'Proposer un terme',
  description: 'Signaler un mot qui induit en erreur, en deux minutes et sans compte à créer.',
}

export default function PageProposer() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Proposer un terme</h1>
      <p className="text-lg leading-relaxed text-stone-700">
        Un mot qui induit en erreur mérite d’être signalé. Deux minutes suffisent, sans compte à créer.
      </p>
      <FormulaireProposition />
    </div>
  )
}

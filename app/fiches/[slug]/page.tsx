import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EnteteFiche } from '@/components/entete-fiche'
import { Prose } from '@/components/prose'
import { getFiche, getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'

type Params = { params: Promise<{ slug: string }> }

// Sans cela, `dynamicParams` vaut `true` : un slug absent de la liste ci-dessous
// déclencherait un rendu de page à la demande côté serveur, qui lirait le disque
// avant de conclure au 404. À `false`, Next répond 404 sans jamais invoquer la
// page. C'est ce qu'exigent la contrainte globale « chaque page est générée au
// build » et la spec §4 « un slug inconnu ne peut pas exister ».
export const dynamicParams = false

export function generateStaticParams() {
  return getFiches().map((fiche) => ({ slug: fiche.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const fiche = getFiche((await params).slug)
  if (!fiche) return {}
  return { title: fiche.terme, description: fiche.resume }
}

function nomDe(entrees: { slug: string; nom: string }[], slug: string): string {
  return entrees.find((e) => e.slug === slug)?.nom ?? slug
}

export default async function PageFiche({ params }: Params) {
  const taxonomies = chargerTaxonomies()
  const fiche = getFiche((await params).slug, undefined, taxonomies)
  if (!fiche) notFound()

  return (
    <article>
      <EnteteFiche
        fiche={fiche}
        nomDiscipline={nomDe(taxonomies.disciplines, fiche.discipline)}
        nomConfusion={nomDe(taxonomies.confusions, fiche.confusion)}
        nomStatut={nomDe(taxonomies.statuts, fiche.statut)}
      />
      <Prose html={await rendreMarkdown(fiche.corps)} />
    </article>
  )
}

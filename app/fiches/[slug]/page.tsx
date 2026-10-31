import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BandeauChantier } from '@/components/bandeau-chantier'
import { BandeauDemonstration } from '@/components/bandeau-demonstration'
import { EnteteFiche } from '@/components/entete-fiche'
import { Precedents } from '@/components/precedents'
import { Prose } from '@/components/prose'
import { Sources } from '@/components/sources'
import { Votes } from '@/components/votes'
import { getChantier } from '@/lib/content/chantiers'
import { getMotifs } from '@/lib/content/motifs'
import { getFiche, getFiches } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'
import { chargerTaxonomies } from '@/lib/content/taxonomies'
import { empreinteAlternative } from '@/lib/votes/empreintes'

type Params = { params: Promise<{ slug: string }> }

// `generateMetadata` et le composant de page sont deux invocations distinctes
// de Next pour la même fiche, et chacune a besoin des taxonomies pour
// résoudre `getFiche`. `cache` de React mémoïse l'appel pour la durée du
// rendu de cette route : chargerTaxonomies() ne s'exécute plus qu'une fois
// par fiche au build plutôt que deux.
const taxonomiesDeLaRequete = cache(() => chargerTaxonomies())

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
  const fiche = getFiche((await params).slug, undefined, taxonomiesDeLaRequete())
  if (!fiche) return {}
  return {
    title: fiche.terme,
    description: fiche.resume,
    openGraph: { title: fiche.terme, description: fiche.resume, type: 'article' },
  }
}

function nomDe(entrees: { slug: string; nom: string }[], slug: string): string {
  return entrees.find((e) => e.slug === slug)?.nom ?? slug
}

export default async function PageFiche({ params }: Params) {
  const taxonomies = taxonomiesDeLaRequete()
  const fiche = getFiche((await params).slug, undefined, taxonomies)
  if (!fiche) notFound()
  const motifs = getMotifs().filter((m) => fiche.motifs.includes(m.slug))
  const chantier = fiche.chantier ? getChantier(fiche.chantier, undefined, taxonomies) : null

  return (
    <article>
      <EnteteFiche
        fiche={fiche}
        nomDiscipline={nomDe(taxonomies.disciplines, fiche.discipline)}
        nomConfusion={nomDe(taxonomies.confusions, fiche.confusion)}
        nomStatut={nomDe(taxonomies.statuts, fiche.statut)}
        nomPreuve={nomDe(taxonomies.preuves, fiche.preuve)}
      />
      {fiche.demonstration && <BandeauDemonstration />}
      {chantier && <BandeauChantier slug={chantier.slug} nom={chantier.nom} />}
      <Precedents precedents={fiche.precedents} />
      <Prose html={await rendreMarkdown(fiche.corps)} />
      <Sources sources={fiche.sources} />
      {motifs.length > 0 && (
        <aside className="mt-8 border-t border-stone-200 pt-4 text-sm text-stone-700">
          <p>
            {motifs.length === 1 ? 'Ce terme illustre un piège qui revient ailleurs : ' : 'Ce terme illustre des pièges qui reviennent ailleurs : '}
            {motifs.map((motif, i) => (
              <span key={motif.slug}>
                {i > 0 && ', '}
                <Link href={`/motifs/${motif.slug}`} className="font-medium underline hover:text-stone-900">
                  {motif.nom}
                </Link>
              </span>
            ))}
            .
          </p>
        </aside>
      )}
      <Votes
        fiche={fiche.slug}
        alternatives={fiche.suggestions.map((texte) => ({
          texte,
          empreinte: empreinteAlternative(texte),
        }))}
      />
    </article>
  )
}

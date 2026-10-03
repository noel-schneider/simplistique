import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Votes } from '@/components/votes'
import { getFiche } from '@/lib/content/fiches'
import PageFiche, { generateMetadata } from './page'

describe('generateMetadata d\'une fiche', () => {
  it('reprend le terme en titre et le resume en description', async () => {
    // generateMetadata reçoit `params` sous forme de promesse dans Next 16 :
    // on l'appelle exactement comme Next le ferait.
    const metadonnees = await generateMetadata({
      params: Promise.resolve({ slug: 'groupe-mathematiques' }),
    })

    const fiche = getFiche('groupe-mathematiques')
    expect(fiche).not.toBeNull()

    expect(metadonnees.title).toBe(fiche?.terme)
    expect(metadonnees.description).toBe(fiche?.resume)
    expect(metadonnees.openGraph).toMatchObject({
      title: fiche?.terme,
      description: fiche?.resume,
    })
  })

  it('rend des métadonnées vides pour un slug inconnu', async () => {
    const metadonnees = await generateMetadata({
      params: Promise.resolve({ slug: 'licorne-maths' }),
    })
    expect(metadonnees).toEqual({})
  })
})

describe('PageFiche', () => {
  it('branche <Votes> sur l’empreinte de chaque alternative, pas sur son texte', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'actif-comptabilite' }) })

    // Un dessin amputé du bloc <Votes> afficherait la fiche sans qu’aucune
    // assertion ne bronche : on exige explicitement sa présence.
    const enfants = (page as ReactElement<{ children: ReactNode[] }>).props.children
    const votes = enfants.find(
      (enfant): enfant is ReactElement<ComponentProps<typeof Votes>> =>
        isValidElement(enfant) && enfant.type === Votes,
    )
    expect(votes).toBeDefined()

    // `a2d8a39243d55e10` est l’empreinte de « avoirs », une suggestion de
    // content/fiches/actif-comptabilite.md. Un littéral, pas une valeur
    // recalculée : si la suggestion est renommée, ce test doit tomber
    // bruyamment plutôt que de s’adapter en silence.
    expect(votes?.props.alternatives).toContainEqual({
      texte: 'avoirs',
      empreinte: 'a2d8a39243d55e10',
    })
  })
})

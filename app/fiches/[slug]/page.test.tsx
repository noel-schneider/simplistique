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
  // Parcours récursif, et non lecture des enfants directs de `<article>` : envelopper
  // `<Votes>` dans une `<div>` ou l’extraire dans un sous-composant ne change rien pour
  // un visiteur, et ne doit donc pas faire tomber ce test. Ce qui doit le faire tomber,
  // c’est la disparition du composant ou la perte de l’identité des alternatives.
  function trouverVotes(noeud: ReactNode): ReactElement<ComponentProps<typeof Votes>> | null {
    if (Array.isArray(noeud)) {
      for (const enfant of noeud) {
        const trouve = trouverVotes(enfant)
        if (trouve) return trouve
      }
      return null
    }
    if (!isValidElement(noeud)) return null
    if (noeud.type === Votes) return noeud as ReactElement<ComponentProps<typeof Votes>>
    return trouverVotes((noeud.props as { children?: ReactNode }).children)
  }

  it('branche <Votes> sur le slug et sur l’empreinte de chaque alternative', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'actif-comptabilite' }) })
    const votes = trouverVotes(page)

    // Un dessin amputé du bloc <Votes> afficherait la fiche sans qu’aucune autre
    // assertion ne bronche : on exige explicitement sa présence.
    expect(votes).not.toBeNull()

    // Le slug, et non le terme : c’est lui que la route valide contre le corpus.
    // Passer `fiche.terme` ferait répondre 404 à chaque vote, pour toujours.
    expect(votes?.props.fiche).toBe('actif-comptabilite')

    // Les deux empreintes, en entier et dans l’ordre du fichier : une liste tronquée
    // ferait disparaître un bouton sans bruit. Ce sont des littéraux et non des
    // valeurs recalculées — si une suggestion est renommée, ce test doit tomber
    // bruyamment plutôt que de s’adapter en silence. Ils correspondent à
    // « avoirs » et « ressources » de content/fiches/actif-comptabilite.md.
    expect(votes?.props.alternatives).toEqual([
      { texte: 'avoirs', empreinte: 'a2d8a39243d55e10' },
      { texte: 'ressources', empreinte: '8e3830470c8d4f95' },
    ])
  })

  it('passe une liste vide pour une fiche sans alternative', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'groupe-mathematiques' }) })
    expect(trouverVotes(page)?.props.alternatives).toEqual([])
  })
})

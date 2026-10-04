import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { BandeauChantier } from '@/components/bandeau-chantier'
import { BandeauDemonstration } from '@/components/bandeau-demonstration'
import { Prose } from '@/components/prose'
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
  /**
   * Tous les éléments de l’arbre, en profondeur d’abord, dans l’ordre où React les
   * rendrait. On ne lit jamais les seuls enfants directs : envelopper un composant
   * dans une `<div>` ou l’extraire dans un sous-composant ne change rien pour un
   * visiteur, et ne doit donc pas faire tomber un test.
   */
  function elementsDans(noeud: ReactNode): ReactElement[] {
    if (Array.isArray(noeud)) return noeud.flatMap(elementsDans)
    if (!isValidElement(noeud)) return []
    return [noeud, ...elementsDans((noeud.props as { children?: ReactNode }).children)]
  }

  function trouverVotes(noeud: ReactNode): ReactElement<ComponentProps<typeof Votes>> | null {
    return (
      elementsDans(noeud).find(
        (element): element is ReactElement<ComponentProps<typeof Votes>> => element.type === Votes,
      ) ?? null
    )
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

  it('annonce une fiche de démonstration avant tout le reste', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'anneau-mathematiques' }) })
    const types = elementsDans(page).map((element) => element.type)

    // Avant le bandeau de chantier comme avant le corps : si une page est fictive,
    // c’est la première chose à savoir, et tout ce qui suit se lit à cette lumière.
    expect(types).toContain(BandeauDemonstration)
    expect(types.indexOf(BandeauDemonstration)).toBeLessThan(types.indexOf(Prose))
  })

  it('n’annonce rien sur une fiche réelle', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'actif-comptabilite' }) })
    expect(elementsDans(page).map((e) => e.type)).not.toContain(BandeauDemonstration)
  })

  it('affiche le bandeau du chantier AVANT le corps de la fiche', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'actif-comptabilite' }) })
    const types = elementsDans(page).map((element) => element.type)

    // La position est une exigence de la spec, pas une préférence : un bandeau
    // placé après les suggestions arriverait quand le lecteur s’est déjà fait un
    // avis, c’est-à-dire trop tard pour servir à quelque chose.
    expect(types).toContain(BandeauChantier)
    expect(types.indexOf(BandeauChantier)).toBeLessThan(types.indexOf(Prose))
  })

  it('n’affiche aucun bandeau pour une fiche sans chantier', async () => {
    const page = await PageFiche({ params: Promise.resolve({ slug: 'groupe-mathematiques' }) })
    expect(elementsDans(page).map((element) => element.type)).not.toContain(BandeauChantier)
  })
})

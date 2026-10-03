import { describe, expect, it } from 'vitest'
import { getFiche } from '@/lib/content/fiches'
import { generateMetadata } from './page'

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

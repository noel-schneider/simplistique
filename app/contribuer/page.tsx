import type { Metadata } from 'next'
import { Prose } from '@/components/prose'
import { getDocument } from '@/lib/content/fiches'
import { rendreMarkdown } from '@/lib/content/markdown'

export const metadata: Metadata = { title: 'Contribuer' }

export default async function PageContribuer() {
  return <Prose html={await rendreMarkdown(getDocument('contribuer'))} />
}

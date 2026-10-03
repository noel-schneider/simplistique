import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Simplistique', template: '%s — Simplistique' },
  description:
    'Simplifier le langage des disciplines scientifiques et artistiques, pour abaisser la barrière à l\'entrée et bâtir des ponts entre elles.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-stone-50 text-stone-900 antialiased">
        <Navigation />
        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
        <footer className="mx-auto max-w-3xl px-5 pb-10 text-sm text-stone-500">
          Un corpus ouvert. Les suggestions passent par le dépôt — voir{' '}
          <a className="underline" href="/contribuer">
            Contribuer
          </a>
          .
        </footer>
      </body>
    </html>
  )
}

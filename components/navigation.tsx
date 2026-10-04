import Link from 'next/link'

const LIENS = [
  { href: '/manifeste', libelle: 'Manifeste' },
  { href: '/fiches', libelle: 'Fiches' },
  { href: '/contribuer', libelle: 'Contribuer' },
] as const

export function Navigation() {
  return (
    <nav className="border-b border-stone-200">
      <div className="mx-auto flex max-w-3xl flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4">
        <Link href="/" className="font-semibold tracking-tight text-stone-900">
          Simplistique
        </Link>
        <div className="flex gap-x-5 text-sm">
          {LIENS.map(({ href, libelle }) => (
            <Link key={href} href={href} className="text-stone-600 hover:text-stone-900">
              {libelle}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

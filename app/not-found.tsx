import Link from 'next/link'

export default function NonTrouve() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Cette page n’existe pas</h1>
      <p className="text-stone-700">
        Le terme que vous cherchez n’a peut-être pas encore de fiche — ce qui est une invitation.
      </p>
      <p>
        <Link href="/fiches" className="underline">
          Parcourir les fiches
        </Link>{' '}
        ou{' '}
        <Link href="/contribuer" className="underline">
          proposer une analyse
        </Link>
        .
      </p>
    </div>
  )
}

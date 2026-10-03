'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Etat = {
  fiche: number
  alternatives: Record<string, number>
  miens: { fiche: boolean; alternatives: string[] }
}

type Alternative = { texte: string; empreinte: string }

function phraseDuCompte(compte: number): string {
  if (compte === 0) return 'Personne n’a encore été gêné par ce terme.'
  if (compte === 1) return 'Une personne a été gênée par ce terme.'
  return `${compte} personnes ont été gênées par ce terme.`
}

function estEtat(valeur: unknown): valeur is Etat {
  if (typeof valeur !== 'object' || valeur === null) return false
  const objet = valeur as Record<string, unknown>
  const miens = objet.miens as Record<string, unknown> | null | undefined
  return (
    typeof objet.fiche === 'number' &&
    typeof objet.alternatives === 'object' &&
    objet.alternatives !== null &&
    typeof miens === 'object' &&
    miens !== null &&
    typeof miens.fiche === 'boolean' &&
    Array.isArray(miens.alternatives)
  )
}

export function Votes({ fiche, alternatives }: { fiche: string; alternatives: Alternative[] }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [charge, setCharge] = useState(false)
  const dernierEnvoi = useRef(0)

  const relire = useCallback(async () => {
    try {
      const r = await fetch(`/api/votes?fiche=${encodeURIComponent(fiche)}`)
      if (!r.ok) return null
      const recu = await r.json()
      return estEtat(recu) ? recu : null
    } catch {
      return null
    }
  }, [fiche])

  useEffect(() => {
    let vivant = true
    relire().then((recu) => {
      if (!vivant) return
      if (recu) setEtat(recu)
      setCharge(true)
    })
    return () => {
      vivant = false
    }
  }, [relire])

  // La base peut être absente, en panne, ou mal configurée : on n'affiche alors
  // rien du tout. Un signal indicatif qui manque n'est pas un incident pour le
  // lecteur, et la fiche elle-même s'affiche parfaitement sans lui.
  if (!etat) return <div data-charge={charge ? 'oui' : 'non'} hidden />

  return (
    <section data-charge="oui" className="mt-8 space-y-4 border-t border-stone-200 pt-6">
      <p role="status" className="sr-only">
        {phraseDuCompte(etat.fiche)}
      </p>

      <Bouton
        question="Ce terme vous a-t-il gêné ?"
        compte={etat.fiche}
        vote={etat.miens.fiche}
        onBascule={() => basculer(null)}
      />

      {alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">Quelle alternative préférez-vous ?</p>
          {alternatives.map((a) => (
            <Bouton
              key={a.empreinte}
              question={a.texte}
              compte={etat.alternatives[a.empreinte] ?? 0}
              vote={etat.miens.alternatives.includes(a.empreinte)}
              onBascule={() => basculer(a.empreinte)}
            />
          ))}
        </div>
      )}
    </section>
  )

  async function basculer(alternative: string | null) {
    const avant = etat!
    const vote =
      alternative === null ? avant.miens.fiche : avant.miens.alternatives.includes(alternative)

    // Chaque bascule prend un numéro. Une réponse qui revient alors qu'une bascule
    // plus récente est partie ne doit plus rien écrire : sinon deux clics rapprochés
    // dont les réponses arrivent dans le désordre laissent l'affichage sur l'état le
    // plus ancien, et rien ne le rattrape jamais.
    const envoi = dernierEnvoi.current + 1
    dernierEnvoi.current = envoi

    setEtat(optimiste(avant, alternative, !vote))

    try {
      const r = await fetch('/api/votes', {
        method: vote ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fiche, alternative }),
      })
      if (envoi !== dernierEnvoi.current) return

      if (r.ok) {
        const recu = await r.json()
        if (envoi !== dernierEnvoi.current) return
        if (estEtat(recu)) {
          setEtat(recu)
          return
        }
      }

      // 409 : le serveur sait que ce visiteur a déjà voté, le navigateur
      // l'ignorait. Ce n'est pas une erreur à montrer, c'est un désaccord
      // d'état — on se réaligne sur le serveur, en silence.
      const frais = await relire()
      if (envoi !== dernierEnvoi.current) return
      setEtat(frais ?? avant)
    } catch {
      if (envoi !== dernierEnvoi.current) return
      setEtat(avant)
    }
  }
}

function optimiste(etat: Etat, alternative: string | null, ajoute: boolean): Etat {
  const delta = ajoute ? 1 : -1
  if (alternative === null) {
    return {
      ...etat,
      fiche: Math.max(0, etat.fiche + delta),
      miens: { ...etat.miens, fiche: ajoute },
    }
  }
  return {
    ...etat,
    alternatives: {
      ...etat.alternatives,
      [alternative]: Math.max(0, (etat.alternatives[alternative] ?? 0) + delta),
    },
    miens: {
      ...etat.miens,
      alternatives: ajoute
        ? [...etat.miens.alternatives, alternative]
        : etat.miens.alternatives.filter((e) => e !== alternative),
    },
  }
}

function Bouton({
  question,
  compte,
  vote,
  onBascule,
}: {
  question: string
  compte: number
  vote: boolean
  onBascule: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={vote}
      onClick={onBascule}
      className={`flex w-full items-center justify-between gap-4 rounded border px-3 py-2 text-left text-sm ${
        vote ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-300 hover:border-stone-500'
      }`}
    >
      <span>{vote ? `${question} — annuler mon vote` : question}</span>
      <span className="tabular-nums">{compte}</span>
    </button>
  )
}

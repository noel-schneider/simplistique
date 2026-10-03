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
  // Les deux exclusions de tableau comptent autant que le reste : en JavaScript un
  // tableau est un objet non nul, donc un `alternatives` reçu comme tableau passerait
  // le contrôle, puis chaque compteur vaudrait zéro en silence. De même, un
  // `miens.alternatives` rempli d’autre chose que des chaînes ferait répondre `false` à
  // chaque `includes`, et le lecteur verrait « non voté » sur un vote qu’il a émis.
  // Un affichage faux sans erreur est pire qu’un affichage absent.
  return (
    typeof objet.fiche === 'number' &&
    Number.isFinite(objet.fiche) &&
    typeof objet.alternatives === 'object' &&
    objet.alternatives !== null &&
    !Array.isArray(objet.alternatives) &&
    Object.values(objet.alternatives as Record<string, unknown>).every(
      (compte) => typeof compte === 'number' && Number.isFinite(compte),
    ) &&
    typeof miens === 'object' &&
    miens !== null &&
    typeof miens.fiche === 'boolean' &&
    Array.isArray(miens.alternatives) &&
    miens.alternatives.every((empreinte) => typeof empreinte === 'string')
  )
}

export function Votes({ fiche, alternatives }: { fiche: string; alternatives: Alternative[] }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [charge, setCharge] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
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

      {message && (
        <p role="status" className="text-sm text-stone-600">
          {message}
        </p>
      )}
    </section>
  )

  async function basculer(alternative: string | null) {
    const avant = etat!
    const vote =
      alternative === null ? avant.miens.fiche : avant.miens.alternatives.includes(alternative)
    setMessage(null)

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

      // 429 et 404 ne sont pas couverts par le silence que la spec impose au 409 et
      // à la base absente : sans ce message, un lecteur qui atteint la limite horaire
      // ou qui avait la page ouverte avant un redéploiement voit le compteur revenir
      // en arrière et conclut que le site est cassé.
      if (r.status === 429) {
        setMessage('Vous avez voté beaucoup de fois cette heure-ci. Réessayez plus tard.')
      } else if (r.status === 404) {
        setMessage('Cette fiche a changé depuis l’ouverture de la page. Rechargez-la.')
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

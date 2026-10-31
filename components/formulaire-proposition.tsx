'use client'

import { useState, type FormEvent } from 'react'

type Champs = {
  terme: string
  discipline: string
  pourquoi: string
  suggestion: string
  site: string
}

type Nom = Exclude<keyof Champs, 'site'>

type Etat =
  | { phase: 'saisie' }
  | { phase: 'envoi' }
  | { phase: 'merci' }
  | { phase: 'invalide'; champs: Nom[] }
  | { phase: 'trop' }
  | { phase: 'indisponible' }

// Table exhaustive : un champ ajouté au type sans libellé ne compile pas.
const LIBELLES: Record<Nom, string> = {
  terme: 'Le terme',
  discipline: 'Discipline',
  pourquoi: 'Pourquoi il induit en erreur',
  suggestion: 'Une suggestion',
}

const VIDE: Champs = { terme: '', discipline: '', pourquoi: '', suggestion: '', site: '' }

function estNom(valeur: unknown): valeur is Nom {
  return typeof valeur === 'string' && Object.prototype.hasOwnProperty.call(LIBELLES, valeur)
}

// Même discipline que `components/votes.tsx` : on ne fait pas confiance à la forme de la
// réponse. Un `champs` mal formé ne doit pas marquer un champ au hasard en erreur.
function champsEnErreur(corps: unknown): Nom[] {
  if (typeof corps !== 'object' || corps === null) return []
  const champs = (corps as Record<string, unknown>).champs
  return Array.isArray(champs) ? champs.filter(estNom) : []
}

export function FormulaireProposition() {
  const [valeurs, setValeurs] = useState<Champs>(VIDE)
  const [etat, setEtat] = useState<Etat>({ phase: 'saisie' })

  function change(nom: keyof Champs, valeur: string) {
    setValeurs((v) => ({ ...v, [nom]: valeur }))
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    if (etat.phase === 'envoi') return
    setEtat({ phase: 'envoi' })
    try {
      const r = await fetch('/api/propositions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(valeurs),
      })
      if (r.status === 201) {
        setValeurs(VIDE)
        setEtat({ phase: 'merci' })
      } else if (r.status === 400) {
        const corps: unknown = await r.json().catch(() => null)
        setEtat({ phase: 'invalide', champs: champsEnErreur(corps) })
      } else if (r.status === 429) {
        setEtat({ phase: 'trop' })
      } else {
        // 403, 503 et tout le reste : la saisie reste dans le formulaire, rien n’est perdu.
        setEtat({ phase: 'indisponible' })
      }
    } catch {
      setEtat({ phase: 'indisponible' })
    }
  }

  if (etat.phase === 'merci') {
    return (
      <p role="status" className="rounded border border-stone-200 p-4 text-stone-800">
        Merci, la proposition est arrivée
      </p>
    )
  }

  const enErreur = etat.phase === 'invalide' ? etat.champs : []

  function champ(nom: Nom, options: { requis?: boolean; long?: boolean; aide?: string; max: number }) {
    const invalide = enErreur.includes(nom)
    const classes =
      'mt-1 w-full rounded border bg-white px-3 py-2 text-stone-900 ' +
      (invalide ? 'border-red-700' : 'border-stone-300')
    const commun = {
      id: `proposition-${nom}`,
      name: nom,
      value: valeurs[nom],
      maxLength: options.max,
      required: options.requis,
      'aria-invalid': invalide || undefined,
      'aria-describedby': options.aide ? `proposition-${nom}-aide` : undefined,
      className: classes,
    }
    return (
      <div>
        <label htmlFor={commun.id} className="block text-sm font-medium text-stone-800">
          {LIBELLES[nom]}
          {options.requis ? '' : ' (facultatif)'}
        </label>
        {options.aide && (
          <p id={`proposition-${nom}-aide`} className="text-sm text-stone-600">
            {options.aide}
          </p>
        )}
        {options.long ? (
          <textarea {...commun} rows={6} onChange={(e) => change(nom, e.target.value)} />
        ) : (
          <input {...commun} type="text" onChange={(e) => change(nom, e.target.value)} />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} noValidate className="space-y-5">
      {champ('terme', { requis: true, max: 120 })}
      {champ('discipline', { max: 80 })}
      {champ('pourquoi', {
        requis: true,
        long: true,
        max: 2000,
        aide: 'Le malentendu : ce que le mot laisse comprendre, et ce qu’il veut dire en réalité (20 caractères minimum)',
      })}
      {champ('suggestion', { max: 200 })}

      {/* Champ piège : un robot remplit tout ce qu’il trouve, une personne ne le voit pas.
          Hors écran plutôt que `display: none`, que certains robots savent ignorer ;
          hors tabulation et caché des lecteurs d’écran pour qu’aucune personne ne le remplisse. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input
            type="text"
            name="site"
            tabIndex={-1}
            autoComplete="off"
            value={valeurs.site}
            onChange={(e) => change('site', e.target.value)}
          />
        </label>
      </div>

      {etat.phase === 'invalide' && (
        <p role="alert" className="text-sm text-red-800">
          {enErreur.length > 0
            ? `À revoir : ${enErreur.map((n) => LIBELLES[n].toLowerCase()).join(', ')}.`
            : 'Certains champs sont à revoir.'}
        </p>
      )}
      {etat.phase === 'trop' && (
        <p role="alert" className="text-sm text-red-800">
          Trop de propositions d’un coup : nouvel envoi possible dans une heure
        </p>
      )}
      {etat.phase === 'indisponible' && (
        <p role="alert" className="text-sm text-red-800">
          L’envoi n’est pas disponible pour l’instant. La saisie est conservée : un nouvel essai un peu
          plus tard devrait fonctionner.
        </p>
      )}

      <button
        type="submit"
        disabled={etat.phase === 'envoi'}
        className="rounded bg-stone-900 px-4 py-2 text-sm text-stone-50 hover:bg-stone-700 disabled:opacity-60"
      >
        Envoyer
      </button>

      <p className="text-sm text-stone-600">
        Ce qui est enregistré : le texte saisi, une empreinte non réversible de la connexion (pour
        limiter les envois à cinq par heure) et la date.
      </p>
    </form>
  )
}

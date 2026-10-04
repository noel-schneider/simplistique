import type { Issue } from './service'

/**
 * Les deux variables vont ensemble : sans sel, le haché d'une adresse IP se
 * casse par force brute. Rendre `null` plutôt que de se rabattre sur un sel
 * vide est ce qui garantit qu'aucune empreinte faible n'est jamais écrite.
 */
export function configurationVotes(
  env: Record<string, string | undefined>,
): { url: string; sel: string } | null {
  const url = env.DATABASE_URL
  const sel = env.SEL_VOTES
  if (!url || !sel || !sel.trim()) return null
  return { url, sel }
}

export function codeHttp(issue: Issue): number {
  switch (issue.type) {
    case 'ok':
      return 200
    case 'inconnu':
      return 404
    case 'deja':
    case 'absent':
      return 409
    case 'trop':
      return 429
  }
}

export function corpsDeReponse(issue: Issue): unknown {
  return issue.type === 'ok'
    ? { fiche: issue.comptes.fiche, alternatives: issue.comptes.alternatives, miens: issue.miens }
    : { erreur: issue.type }
}

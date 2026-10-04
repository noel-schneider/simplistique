/**
 * Affiché en haut d’une fiche ou d’un chantier dont le contenu est fictif.
 *
 * Le marquage vit dans le front-matter plutôt que dans le texte : une mention
 * noyée dans le corps se perd à la relecture, et surtout rien ne pourrait la
 * compter. Un champ se cherche d’un `grep`, se compte à chaque `lint:content`,
 * et interdit d’oublier une fiche le jour où l’on fera le ménage.
 */
export function BandeauDemonstration() {
  return (
    <aside className="mb-8 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>
        <strong>Contenu de démonstration.</strong> Cette page est fictive : elle sert à
        développer le site et n’engage aucune analyse réelle.
      </p>
    </aside>
  )
}

CREATE INDEX IF NOT EXISTS propositions_par_date
  -- Plafond global de propositions par heure : il compte tous auteurs confondus,
  -- ce que l'index (auteur, cree_le) de 002 ne sert pas.
  ON propositions (cree_le);

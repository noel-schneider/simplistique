CREATE TABLE IF NOT EXISTS votes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fiche       text        NOT NULL,
  alternative text,
  votant      text        NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now(),

  -- NULLS NOT DISTINCT est indispensable : sans lui, les votes de fiche
  -- (alternative NULL) ne se bloqueraient pas entre eux, puisqu'en SQL NULL
  -- n'est jamais egal a NULL. On pourrait voter mille fois sur une fiche sans
  -- que la contrainte proteste. Exige PostgreSQL 15 ou plus.
  CONSTRAINT vote_unique UNIQUE NULLS NOT DISTINCT (fiche, alternative, votant)
);

CREATE INDEX IF NOT EXISTS votes_par_fiche ON votes (fiche);
CREATE INDEX IF NOT EXISTS votes_par_votant_date ON votes (votant, cree_le);

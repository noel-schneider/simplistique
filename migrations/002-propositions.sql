CREATE TABLE IF NOT EXISTS propositions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  terme       text        NOT NULL DEFAULT '',
  discipline  text        NOT NULL DEFAULT '',
  pourquoi    text        NOT NULL DEFAULT '',
  suggestion  text        NOT NULL DEFAULT '',
  -- Empreinte salee (empreinteVotant), pour la limite de debit uniquement.
  auteur      text        NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now(),
  -- NULL tant que la proposition attend la moderation.
  traitee_le  timestamptz
);

CREATE INDEX IF NOT EXISTS propositions_par_auteur_date ON propositions (auteur, cree_le);

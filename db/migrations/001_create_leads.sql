-- Consented leads from the booth (one row per visitor session + address).
CREATE TABLE IF NOT EXISTS leads (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  name          TEXT,
  consent       BOOLEAN     NOT NULL CHECK (consent),
  lang          TEXT        NOT NULL CHECK (lang IN ('en', 'ar')),
  brief         JSONB       NOT NULL,
  strategy_name JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, email)
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

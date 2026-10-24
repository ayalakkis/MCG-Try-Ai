-- Every visitor who got a plan, with or without an email (no name, email or audio stored here).
CREATE TABLE IF NOT EXISTS sessions (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT        NOT NULL UNIQUE,
  lang          TEXT        NOT NULL CHECK (lang IN ('en', 'ar')),
  brief         JSONB       NOT NULL,
  strategy_name JSONB       NOT NULL,
  emailed       BOOLEAN     NOT NULL DEFAULT false,
  demo          BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions (created_at DESC);

-- Demo rows (npm run db:demo) can be removed in one go before the event.
ALTER TABLE events ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo BOOLEAN NOT NULL DEFAULT false;

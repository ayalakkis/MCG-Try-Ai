-- Anonymous usage counts for the admin stats: no names, emails, answers or audio.
CREATE TABLE IF NOT EXISTS events (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT        NOT NULL CHECK (type IN ('session_started', 'brief_completed', 'strategy_generated', 'email_sent')),
  lang       TEXT        NOT NULL CHECK (lang IN ('en', 'ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at DESC);

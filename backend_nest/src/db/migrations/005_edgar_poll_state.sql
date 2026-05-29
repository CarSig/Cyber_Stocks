CREATE TABLE IF NOT EXISTS edgar.poll_state (
  ticker       TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL
);

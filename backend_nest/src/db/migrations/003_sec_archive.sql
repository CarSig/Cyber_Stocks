CREATE TABLE IF NOT EXISTS sec_download_sessions (
  id           SERIAL PRIMARY KEY,
  ticker       TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_from    DATE NOT NULL,
  date_to      DATE NOT NULL,
  form_types   TEXT[] NOT NULL,
  files_saved  INT NOT NULL DEFAULT 0
);

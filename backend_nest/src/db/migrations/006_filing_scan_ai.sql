ALTER TABLE edgar.filing_scans
  ADD COLUMN IF NOT EXISTS ai_real_incident BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_confidence    NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_incident_type TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary       TEXT,
  ADD COLUMN IF NOT EXISTS ai_model         TEXT;

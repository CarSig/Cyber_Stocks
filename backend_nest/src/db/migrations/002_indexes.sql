-- additional indexes identified in review
CREATE INDEX IF NOT EXISTS stock_quotes_date_idx ON stock_quotes (date DESC);

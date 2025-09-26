\echo 'Seeding fake companies into market_companies.'

\set content `cat /tmp/fake_companies.json`

BEGIN;

-- Avoid blocking on synchronous replicas that have not caught up yet.
SET LOCAL synchronous_commit TO LOCAL;

CREATE TABLE IF NOT EXISTS market_companies (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  region TEXT NOT NULL,
  market_cap_millions NUMERIC(18,2) NOT NULL,
  base_price NUMERIC(18,2) NOT NULL,
  volatility NUMERIC(10,5) NOT NULL,
  story TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH payload AS (
  SELECT *
  FROM jsonb_to_recordset(:'content'::jsonb) AS (
    ticker TEXT,
    name TEXT,
    sector TEXT,
    region TEXT,
    market_cap_millions NUMERIC,
    base_price NUMERIC,
    volatility NUMERIC,
    story TEXT
  )
)
INSERT INTO market_companies (
  ticker,
  name,
  sector,
  region,
  market_cap_millions,
  base_price,
  volatility,
  story
)
SELECT
  ticker,
  name,
  sector,
  region,
  market_cap_millions,
  base_price,
  volatility,
  story
FROM payload
ON CONFLICT (ticker) DO UPDATE SET
  name = EXCLUDED.name,
  sector = EXCLUDED.sector,
  region = EXCLUDED.region,
  market_cap_millions = EXCLUDED.market_cap_millions,
  base_price = EXCLUDED.base_price,
  volatility = EXCLUDED.volatility,
  story = EXCLUDED.story,
  updated_at = NOW();

COMMIT;

\echo 'Seed completed.'

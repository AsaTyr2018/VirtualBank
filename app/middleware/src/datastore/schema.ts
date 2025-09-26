import type { Datastore } from '../plugins/datastore.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS idempotency_keys (
      idempotency_key TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      response_status INTEGER,
      response_body JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys (expires_at)`,
  `CREATE TABLE IF NOT EXISTS transfers (
      transfer_id TEXT PRIMARY KEY,
      source_account_id TEXT NOT NULL,
      destination_account_id TEXT NOT NULL,
      amount NUMERIC(18,2) NOT NULL,
      currency TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE TABLE IF NOT EXISTS transfer_steps (
      step_id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL REFERENCES transfers(transfer_id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE INDEX IF NOT EXISTS idx_transfer_steps_transfer_id ON transfer_steps (transfer_id)`,
  `CREATE TABLE IF NOT EXISTS credit_applications (
      application_id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      requested_limit NUMERIC(18,2) NOT NULL,
      currency TEXT NOT NULL,
      justification TEXT NOT NULL,
      collateral_type TEXT,
      attachments JSONB,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE TABLE IF NOT EXISTS market_orders (
      order_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      order_type TEXT NOT NULL,
      quantity NUMERIC(18,2) NOT NULL,
      limit_price NUMERIC(18,2),
      time_in_force TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
];

export async function ensureSchema(datastore: Datastore): Promise<void> {
  for (const statement of statements) {
    await datastore.query(statement);
  }
}

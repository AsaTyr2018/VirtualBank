import type { Datastore } from '../plugins/datastore.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      available_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      held_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_player_currency ON accounts (player_id, currency)`,
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
  `CREATE INDEX IF NOT EXISTS idx_transfers_source_account ON transfers (source_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transfers_destination_account ON transfers (destination_account_id)`,
  `CREATE TABLE IF NOT EXISTS transfer_steps (
      step_id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL REFERENCES transfers(transfer_id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE INDEX IF NOT EXISTS idx_transfer_steps_transfer_id ON transfer_steps (transfer_id)`,
  `CREATE TABLE IF NOT EXISTS ledger_entries (
      entry_id TEXT PRIMARY KEY,
      transfer_id TEXT REFERENCES transfers(transfer_id) ON DELETE SET NULL,
      account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      amount NUMERIC(18,2) NOT NULL,
      currency TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries (account_id)`,
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exchange_order_id TEXT,
      exchange_status TEXT,
      last_exchange_sync TIMESTAMPTZ
    )`,
  `CREATE INDEX IF NOT EXISTS idx_market_orders_account ON market_orders (account_id)`,
  `CREATE TABLE IF NOT EXISTS transaction_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retries INTEGER NOT NULL DEFAULT 0,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      error TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_events_status ON transaction_events (status, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS session_events (
      session_event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events (session_id, emitted_at DESC)`
];

export async function ensureSchema(datastore: Datastore): Promise<void> {
  for (const statement of statements) {
    await datastore.query(statement);
  }
}

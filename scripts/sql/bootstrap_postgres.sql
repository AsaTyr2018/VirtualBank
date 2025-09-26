-- VirtualBank datastore bootstrap
-- Ensures the PostgreSQL schema and demo records exist for fresh environments.
\echo 'Applying VirtualBank PostgreSQL bootstrap helpers...'
\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    available_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    held_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_player_currency ON accounts (player_id, currency);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS transfers (
    transfer_id TEXT PRIMARY KEY,
    source_account_id TEXT NOT NULL,
    destination_account_id TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_source_account ON transfers (source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination_account ON transfers (destination_account_id);

CREATE TABLE IF NOT EXISTS transfer_steps (
    step_id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES transfers(transfer_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_steps_transfer_id ON transfer_steps (transfer_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
    entry_id TEXT PRIMARY KEY,
    transfer_id TEXT REFERENCES transfers(transfer_id) ON DELETE SET NULL,
    account_id TEXT,
    direction TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ledger_entries
    ADD COLUMN IF NOT EXISTS account_id TEXT;

ALTER TABLE ledger_entries
    ALTER COLUMN account_id DROP NOT NULL;

ALTER TABLE ledger_entries
    DROP CONSTRAINT IF EXISTS ledger_entries_account_id_fkey;

ALTER TABLE ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries (account_id);

CREATE TABLE IF NOT EXISTS credit_applications (
    application_id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    requested_limit NUMERIC(18,2) NOT NULL,
    currency TEXT NOT NULL,
    justification TEXT NOT NULL,
    collateral_type TEXT,
    attachments JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_orders (
    order_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
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
);

CREATE INDEX IF NOT EXISTS idx_market_orders_account ON market_orders (account_id);

CREATE TABLE IF NOT EXISTS transaction_events (
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
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_status ON transaction_events (status, occurred_at);

CREATE TABLE IF NOT EXISTS session_events (
    session_event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events (session_id, emitted_at DESC);

-- Demo dataset ---------------------------------------------------------------

INSERT INTO accounts (account_id, player_id, currency, status, available_balance, held_balance, created_at, updated_at)
VALUES
    ('vault-alpha', 'player-neo', 'VBC', 'active', 12850.75, 250.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 hours'),
    ('quest-goal-1', 'player-neo', 'VBC', 'active', 3150.00, 0.00, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 hour'),
    ('arcade-stash', 'player-neo', 'VBC', 'active', 880.25, 50.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '30 minutes'),
    ('gm-vault', 'game-master', 'VBC', 'active', 50200.00, 0.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day')
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO transfers (transfer_id, source_account_id, destination_account_id, amount, currency, note, status, created_at, updated_at)
VALUES
    ('transfer-demo-001', 'vault-alpha', 'quest-goal-1', 250.00, 'VBC', 'Quest funding boost', 'settled', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 18 hours'),
    ('transfer-demo-002', 'vault-alpha', 'arcade-stash', 120.00, 'VBC', 'Arcade night budget', 'settled', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 6 hours'),
    ('transfer-demo-003', 'gm-vault', 'vault-alpha', 1500.00, 'VBC', 'Weekly stipend', 'pending', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '6 hours')
ON CONFLICT (transfer_id) DO NOTHING;

INSERT INTO transfer_steps (step_id, transfer_id, sequence, name, status, occurred_at)
VALUES
    ('step-demo-001', 'transfer-demo-001', 1, 'Validate source account', 'completed', NOW() - INTERVAL '3 days'),
    ('step-demo-002', 'transfer-demo-001', 2, 'Reserve funds', 'completed', NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
    ('step-demo-003', 'transfer-demo-001', 3, 'Post ledger entries', 'completed', NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
    ('step-demo-004', 'transfer-demo-002', 1, 'Validate source account', 'completed', NOW() - INTERVAL '2 days'),
    ('step-demo-005', 'transfer-demo-002', 2, 'Reserve funds', 'completed', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    ('step-demo-006', 'transfer-demo-002', 3, 'Notify recipient', 'completed', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes'),
    ('step-demo-007', 'transfer-demo-003', 1, 'Validate source account', 'completed', NOW() - INTERVAL '12 hours'),
    ('step-demo-008', 'transfer-demo-003', 2, 'Reserve funds', 'in_progress', NOW() - INTERVAL '11 hours 30 minutes')
ON CONFLICT (step_id) DO NOTHING;

INSERT INTO ledger_entries (entry_id, transfer_id, account_id, direction, amount, currency, occurred_at)
VALUES
    ('ledger-demo-001', 'transfer-demo-001', 'vault-alpha', 'debit', 250.00, 'VBC', NOW() - INTERVAL '3 days'),
    ('ledger-demo-002', 'transfer-demo-001', 'quest-goal-1', 'credit', 250.00, 'VBC', NOW() - INTERVAL '3 days'),
    ('ledger-demo-003', 'transfer-demo-002', 'vault-alpha', 'debit', 120.00, 'VBC', NOW() - INTERVAL '2 days'),
    ('ledger-demo-004', 'transfer-demo-002', 'arcade-stash', 'credit', 120.00, 'VBC', NOW() - INTERVAL '2 days'),
    ('ledger-demo-005', 'transfer-demo-003', 'gm-vault', 'debit', 1500.00, 'VBC', NOW() - INTERVAL '12 hours'),
    ('ledger-demo-006', 'transfer-demo-003', 'vault-alpha', 'credit', 1500.00, 'VBC', NOW() - INTERVAL '12 hours')
ON CONFLICT (entry_id) DO NOTHING;

INSERT INTO credit_applications (application_id, player_id, account_id, requested_limit, currency, justification, collateral_type, attachments, status, created_at, updated_at)
VALUES
    ('credit-demo-001', 'player-neo', 'vault-alpha', 5000.00, 'VBC', 'Upgrade the quest headquarters with new holo-displays.', 'inventory', '{"quotes": 2}', 'approved', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),
    ('credit-demo-002', 'player-neo', 'quest-goal-1', 1200.00, 'VBC', 'Seasonal quest-line marketing campaign.', 'receivables', '{"deck": "v2"}', 'under_review', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
    ('credit-demo-003', 'game-master', 'gm-vault', 10000.00, 'VBC', 'Emergency liquidity buffer for live events.', 'treasury', '{"approvals": ["risk", "finance"]}', 'rejected', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days')
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO market_orders (order_id, account_id, symbol, side, order_type, quantity, limit_price, time_in_force, status, created_at, updated_at, exchange_order_id, exchange_status, last_exchange_sync)
VALUES
    ('order-demo-001', 'vault-alpha', 'BANKX', 'buy', 'limit', 120.00, 42.50, 'GTC', 'accepted', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 20 minutes', 'ex-441', 'acknowledged', NOW() - INTERVAL '1 day 15 minutes'),
    ('order-demo-002', 'quest-goal-1', 'VRQL', 'sell', 'market', 45.00, NULL, 'IOC', 'filled', NOW() - INTERVAL '26 hours', NOW() - INTERVAL '25 hours 30 minutes', 'ex-442', 'filled', NOW() - INTERVAL '25 hours'),
    ('order-demo-003', 'arcade-stash', 'PIX', 'buy', 'limit', 25.00, 18.75, 'DAY', 'cancelling', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '30 minutes', 'ex-443', 'pending_cancel', NOW() - INTERVAL '20 minutes')
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO transaction_events (event_id, event_type, resource_type, resource_id, payload, status, retries, occurred_at, published_at, error)
VALUES
    ('event-demo-001', 'transfer.settled', 'transfer', 'transfer-demo-001', '{"amount":250,"currency":"VBC"}', 'published', 0, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '5 minutes', NULL),
    ('event-demo-002', 'transfer.settled', 'transfer', 'transfer-demo-002', '{"amount":120,"currency":"VBC"}', 'published', 0, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '7 minutes', NULL),
    ('event-demo-003', 'transfer.pending', 'transfer', 'transfer-demo-003', '{"amount":1500,"currency":"VBC"}', 'pending', 1, NOW() - INTERVAL '12 hours', NULL, 'Awaiting exchange confirmation')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO session_events (session_event_id, session_id, event_type, payload, emitted_at)
VALUES
    ('session-demo-001', 'session-neo', 'session.started', '{"player":"player-neo"}', NOW() - INTERVAL '1 day'),
    ('session-demo-002', 'session-neo', 'portfolio.refresh', '{"accounts":3}', NOW() - INTERVAL '12 hours'),
    ('session-demo-003', 'session-gamemaster', 'session.started', '{"role":"gm"}', NOW() - INTERVAL '3 hours')
ON CONFLICT (session_event_id) DO NOTHING;

COMMIT;

\echo 'VirtualBank PostgreSQL bootstrap completed.'

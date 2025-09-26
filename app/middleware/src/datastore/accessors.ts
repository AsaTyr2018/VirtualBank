import crypto from 'node:crypto';
import type { Datastore } from '../plugins/datastore.js';

type QueryExecutor = {
  query: Datastore['query'];
};

export interface AccountRecord {
  accountId: string;
  playerId: string;
  currency: string;
  status: string;
  availableBalance: number;
  heldBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRecord {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  note: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferStepRecord {
  stepId: string;
  transferId: string;
  sequence: number;
  name: string;
  status: string;
  occurredAt: string;
}

export interface CreditApplicationRecord {
  applicationId: string;
  playerId: string;
  accountId: string;
  requestedLimit: number;
  currency: string;
  justification: string;
  collateralType: string | null;
  attachments: unknown[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketOrderRecord {
  orderId: string;
  accountId: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  timeInForce: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  exchangeOrderId: string | null;
  exchangeStatus: string | null;
  lastExchangeSync: string | null;
}

export interface TransactionEventRecord {
  eventId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  payload: unknown;
  status: string;
  retries: number;
  occurredAt: string;
  publishedAt: string | null;
  error: string | null;
}

export interface SessionEventRecord {
  sessionEventId: string;
  sessionId: string;
  eventType: string;
  payload: unknown;
  emittedAt: string;
}

function mapAccount(row: any): AccountRecord {
  return {
    accountId: row.account_id,
    playerId: row.player_id,
    currency: row.currency,
    status: row.status,
    availableBalance: Number(row.available_balance),
    heldBalance: Number(row.held_balance),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function getAccountById(executor: QueryExecutor, accountId: string): Promise<AccountRecord | null> {
  const result = await executor.query(
    `SELECT account_id, player_id, currency, status, available_balance, held_balance, created_at, updated_at
       FROM accounts WHERE account_id = $1`,
    [accountId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapAccount(result.rows[0]);
}

export async function ensureAccount(
  executor: QueryExecutor,
  params: { accountId: string; playerId: string; currency: string }
): Promise<AccountRecord> {
  const result = await executor.query(
    `INSERT INTO accounts (account_id, player_id, currency, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (account_id) DO UPDATE SET
         player_id = EXCLUDED.player_id,
         currency = EXCLUDED.currency,
         updated_at = NOW()
       RETURNING account_id, player_id, currency, status, available_balance, held_balance, created_at, updated_at`,
    [params.accountId, params.playerId, params.currency]
  );

  return mapAccount(result.rows[0]);
}

export async function adjustAccountBalances(
  executor: QueryExecutor,
  adjustments: Array<{
    accountId: string;
    availableDelta: number;
    heldDelta?: number;
  }>
): Promise<void> {
  for (const adjustment of adjustments) {
    await executor.query(
      `UPDATE accounts
         SET available_balance = available_balance + $2,
             held_balance = held_balance + $3,
             updated_at = NOW()
       WHERE account_id = $1`,
      [
        adjustment.accountId,
        adjustment.availableDelta.toString(),
        (adjustment.heldDelta ?? 0).toString()
      ]
    );
  }
}

function mapTransfer(row: any): TransferRecord {
  return {
    transferId: row.transfer_id,
    sourceAccountId: row.source_account_id,
    destinationAccountId: row.destination_account_id,
    amount: Number(row.amount),
    currency: row.currency,
    note: row.note,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function insertTransfer(
  executor: QueryExecutor,
  transfer: {
    transferId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: string;
    note?: string | null;
    status: string;
  }
): Promise<TransferRecord> {
  const result = await executor.query(
    `INSERT INTO transfers (
        transfer_id,
        source_account_id,
        destination_account_id,
        amount,
        currency,
        note,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (transfer_id) DO UPDATE SET
        note = EXCLUDED.note,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING transfer_id, source_account_id, destination_account_id, amount, currency, note, status, created_at, updated_at`,
    [
      transfer.transferId,
      transfer.sourceAccountId,
      transfer.destinationAccountId,
      transfer.amount.toString(),
      transfer.currency,
      transfer.note ?? null,
      transfer.status
    ]
  );

  return mapTransfer(result.rows[0]);
}

export async function insertTransferSteps(
  executor: QueryExecutor,
  steps: Array<{
    transferId: string;
    sequence: number;
    name: string;
    status: string;
  }>
): Promise<TransferStepRecord[]> {
  const rows: TransferStepRecord[] = [];

  for (const step of steps) {
    const stepId = crypto.randomUUID();
    const result = await executor.query(
      `INSERT INTO transfer_steps (step_id, transfer_id, sequence, name, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (step_id) DO UPDATE SET status = EXCLUDED.status
         RETURNING step_id, transfer_id, sequence, name, status, occurred_at`,
      [stepId, step.transferId, step.sequence, step.name, step.status]
    );

    const row = result.rows[0];
    rows.push({
      stepId: row.step_id,
      transferId: row.transfer_id,
      sequence: row.sequence,
      name: row.name,
      status: row.status,
      occurredAt: new Date(row.occurred_at).toISOString()
    });
  }

  return rows;
}

export async function fetchTransfer(executor: QueryExecutor, transferId: string): Promise<TransferRecord | null> {
  const result = await executor.query(
    `SELECT transfer_id, source_account_id, destination_account_id, amount, currency, note, status, created_at, updated_at
       FROM transfers WHERE transfer_id = $1`,
    [transferId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapTransfer(result.rows[0]);
}

export async function fetchTransferSteps(
  executor: QueryExecutor,
  transferId: string
): Promise<TransferStepRecord[]> {
  const result = await executor.query(
    `SELECT step_id, transfer_id, sequence, name, status, occurred_at
       FROM transfer_steps WHERE transfer_id = $1 ORDER BY sequence`,
    [transferId]
  );

  return result.rows.map((row) => ({
    stepId: row.step_id,
    transferId: row.transfer_id,
    sequence: row.sequence,
    name: row.name,
    status: row.status,
    occurredAt: new Date(row.occurred_at).toISOString()
  }));
}

export async function insertTransactionEvent(
  executor: QueryExecutor,
  params: {
    eventType: string;
    resourceType: string;
    resourceId: string;
    payload: unknown;
    status?: string;
  }
): Promise<TransactionEventRecord> {
  const result = await executor.query(
    `INSERT INTO transaction_events (event_id, event_type, resource_type, resource_id, payload, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING event_id, event_type, resource_type, resource_id, payload, status, retries, occurred_at, published_at, error`,
    [crypto.randomUUID(), params.eventType, params.resourceType, params.resourceId, JSON.stringify(params.payload), params.status ?? 'pending']
  );

  const row = result.rows[0];
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    payload: row.payload,
    status: row.status,
    retries: row.retries,
    occurredAt: new Date(row.occurred_at).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    error: row.error
  };
}

export async function insertCreditApplication(
  executor: QueryExecutor,
  params: {
    applicationId: string;
    playerId: string;
    accountId: string;
    requestedLimit: number;
    currency: string;
    justification: string;
    collateralType?: string;
    attachments?: string[];
    status: string;
  }
): Promise<CreditApplicationRecord> {
  const result = await executor.query(
    `INSERT INTO credit_applications (
        application_id,
        player_id,
        account_id,
        requested_limit,
        currency,
        justification,
        collateral_type,
        attachments,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      ON CONFLICT (application_id) DO UPDATE SET
        requested_limit = EXCLUDED.requested_limit,
        currency = EXCLUDED.currency,
        justification = EXCLUDED.justification,
        collateral_type = EXCLUDED.collateral_type,
        attachments = EXCLUDED.attachments,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING application_id, player_id, account_id, requested_limit, currency, justification, collateral_type, attachments, status, created_at, updated_at`,
    [
      params.applicationId,
      params.playerId,
      params.accountId,
      params.requestedLimit.toString(),
      params.currency,
      params.justification,
      params.collateralType ?? null,
      JSON.stringify(params.attachments ?? []),
      params.status
    ]
  );

  const row = result.rows[0];
  return {
    applicationId: row.application_id,
    playerId: row.player_id,
    accountId: row.account_id,
    requestedLimit: Number(row.requested_limit),
    currency: row.currency,
    justification: row.justification,
    collateralType: row.collateral_type,
    attachments: row.attachments ?? [],
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function upsertMarketOrder(
  executor: QueryExecutor,
  params: {
    orderId: string;
    accountId: string;
    symbol: string;
    side: string;
    orderType: string;
    quantity: number;
    limitPrice?: number;
    timeInForce?: string;
    status: string;
    exchangeOrderId?: string | null;
    exchangeStatus?: string | null;
  }
): Promise<MarketOrderRecord> {
  const result = await executor.query(
    `INSERT INTO market_orders (
        order_id,
        account_id,
        symbol,
        side,
        order_type,
        quantity,
        limit_price,
        time_in_force,
        status,
        exchange_order_id,
        exchange_status,
        last_exchange_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        limit_price = EXCLUDED.limit_price,
        time_in_force = EXCLUDED.time_in_force,
        status = EXCLUDED.status,
        exchange_order_id = COALESCE(EXCLUDED.exchange_order_id, market_orders.exchange_order_id),
        exchange_status = COALESCE(EXCLUDED.exchange_status, market_orders.exchange_status),
        last_exchange_sync = NOW(),
        updated_at = NOW()
      RETURNING order_id, account_id, symbol, side, order_type, quantity, limit_price, time_in_force, status, created_at, updated_at, exchange_order_id, exchange_status, last_exchange_sync`,
    [
      params.orderId,
      params.accountId,
      params.symbol,
      params.side,
      params.orderType,
      params.quantity.toString(),
      params.limitPrice ?? null,
      params.timeInForce ?? null,
      params.status,
      params.exchangeOrderId ?? null,
      params.exchangeStatus ?? null
    ]
  );

  const row = result.rows[0];
  return {
    orderId: row.order_id,
    accountId: row.account_id,
    symbol: row.symbol,
    side: row.side,
    orderType: row.order_type,
    quantity: Number(row.quantity),
    limitPrice: row.limit_price !== null ? Number(row.limit_price) : null,
    timeInForce: row.time_in_force,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    exchangeOrderId: row.exchange_order_id,
    exchangeStatus: row.exchange_status,
    lastExchangeSync: row.last_exchange_sync ? new Date(row.last_exchange_sync).toISOString() : null
  };
}

export async function insertSessionEvent(
  executor: QueryExecutor,
  params: { sessionId: string; eventType: string; payload: unknown }
): Promise<SessionEventRecord> {
  const result = await executor.query(
    `INSERT INTO session_events (session_event_id, session_id, event_type, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING session_event_id, session_id, event_type, payload, emitted_at`,
    [crypto.randomUUID(), params.sessionId, params.eventType, JSON.stringify(params.payload)]
  );

  const row = result.rows[0];
  return {
    sessionEventId: row.session_event_id,
    sessionId: row.session_id,
    eventType: row.event_type,
    payload: row.payload,
    emittedAt: new Date(row.emitted_at).toISOString()
  };
}

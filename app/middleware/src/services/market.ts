import type { Datastore } from '../plugins/datastore.js';

export interface MarketOrderInput {
  orderId: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  limitPrice?: number;
  timeInForce?: string;
}

export async function recordMarketOrder(datastore: Datastore, input: MarketOrderInput): Promise<void> {
  const now = new Date().toISOString();
  await datastore.query(
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
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    ON CONFLICT (order_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      limit_price = EXCLUDED.limit_price,
      time_in_force = EXCLUDED.time_in_force,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at`,
    [
      input.orderId,
      input.accountId,
      input.symbol,
      input.side,
      input.orderType,
      input.quantity.toString(),
      input.limitPrice !== undefined ? input.limitPrice.toString() : null,
      input.timeInForce ?? null,
      'accepted',
      now
    ]
  );
}

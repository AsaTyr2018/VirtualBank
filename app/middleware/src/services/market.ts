import type { Datastore } from '../plugins/datastore.js';
import type { CacheClient } from '../plugins/cache.js';
import type { EventBridge } from '../plugins/events.js';
import type { StockmarketClient } from '../plugins/stockmarket.js';
import { insertTransactionEvent, upsertMarketOrder } from '../datastore/accessors.js';
import type { DomainEvent } from './domain-events.js';

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

export interface MarketOrderDependencies {
  datastore: Datastore;
  cache: CacheClient;
  events: EventBridge;
  stockmarket: StockmarketClient;
}

export interface MarketOrderContext {
  correlationId: string;
  sessionId?: string;
}

export async function recordMarketOrder(
  deps: MarketOrderDependencies,
  input: MarketOrderInput,
  context: MarketOrderContext
): Promise<void> {
  const orderRecord = await upsertMarketOrder(deps.datastore, {
    orderId: input.orderId,
    accountId: input.accountId,
    symbol: input.symbol,
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    limitPrice: input.limitPrice,
    timeInForce: input.timeInForce,
    status: 'accepted'
  });

  let exchangeOrderId: string | null = null;
  let exchangeStatus: string | null = null;
  let exchangeError: string | null = null;

  try {
    const exchangeResponse = await deps.stockmarket.submitOrder({
      accountId: input.accountId,
      symbol: input.symbol,
      side: input.side,
      orderType: input.orderType,
      quantity: input.quantity,
      limitPrice: input.limitPrice
    });
    exchangeOrderId = exchangeResponse.order.order_id;
    exchangeStatus = exchangeResponse.order.status;
  } catch (error) {
    exchangeError = error instanceof Error ? error.message : 'Unknown stockmarket error';
    exchangeStatus = 'ERROR';
  }

  await upsertMarketOrder(deps.datastore, {
    orderId: input.orderId,
    accountId: input.accountId,
    symbol: input.symbol,
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    limitPrice: input.limitPrice,
    timeInForce: input.timeInForce,
    status: exchangeStatus && exchangeStatus !== 'ERROR' ? exchangeStatus.toLowerCase() : 'pending',
    exchangeOrderId,
    exchangeStatus
  });

  await insertTransactionEvent(deps.datastore, {
    eventType: 'market.orders.accepted',
    resourceType: 'market_order',
    resourceId: input.orderId,
    payload: {
      orderId: input.orderId,
      accountId: input.accountId,
      symbol: input.symbol,
      side: input.side,
      orderType: input.orderType,
      quantity: input.quantity,
      limitPrice: input.limitPrice ?? null,
      correlationId: context.correlationId,
      sessionId: context.sessionId ?? null,
      exchangeOrderId,
      exchangeStatus,
      exchangeError
    }
  });

  await deps.cache.set(`market-order:${input.orderId}`, orderRecord, deps.cache.defaultTtlSeconds);

  const event: DomainEvent = {
    type: 'market.orders.accepted',
    key: input.orderId,
    version: 1,
    payload: {
      orderId: input.orderId,
      accountId: input.accountId,
      symbol: input.symbol,
      side: input.side,
      orderType: input.orderType,
      quantity: input.quantity,
      limitPrice: input.limitPrice ?? null,
      correlationId: context.correlationId,
      sessionId: context.sessionId ?? null,
      exchangeOrderId,
      exchangeStatus,
      exchangeError
    }
  };

  await deps.events.publish(event);
}

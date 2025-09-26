import 'fastify';
import type { Registry, Histogram, Counter } from 'prom-client';
import type { config } from '../config/index.js';
import type { Datastore } from '../plugins/datastore.js';
import type { CacheClient } from '../plugins/cache.js';
import type { EventBridge } from '../plugins/events.js';
import type { StockmarketClient } from '../plugins/stockmarket.js';
import type { AuthenticatedUser } from '../plugins/authentication.js';

type ConfigShape = typeof config;

declare module 'fastify' {
  interface FastifyInstance {
    config: ConfigShape;
    datastore: Datastore;
    cache: CacheClient;
    events: EventBridge;
    stockmarket: StockmarketClient;
    auth: {
      getPrincipal(secret: string): { id: string; roles: string[] } | undefined;
    };
    metrics: {
      registry: Registry;
      httpRequestDuration: Histogram<string>;
      httpRequestErrors: Counter<string>;
    };
    utils: {
      generateTransferId: (sourceAccountId: string, destinationAccountId: string) => string;
      generateCreditApplicationId: (playerId: string, accountId: string) => string;
      generateMarketOrderId: (accountId: string, symbol: string) => string;
      logTransferIntent: (intent: {
        transferId: string;
        sourceAccountId: string;
        destinationAccountId: string;
        amount: number;
        currency: string;
        note?: string;
        correlationId: string;
      }) => Promise<void> | void;
      logCreditApplication: (application: {
        applicationId: string;
        playerId: string;
        accountId: string;
        requestedLimit: number;
        currency: string;
        justification: string;
        collateralType?: string;
        attachments?: string[];
        correlationId: string;
      }) => Promise<void> | void;
      logMarketOrder: (order: {
        orderId: string;
        accountId: string;
        symbol: string;
        side: 'buy' | 'sell';
        orderType: 'market' | 'limit';
        quantity: number;
        limitPrice?: number;
        timeInForce?: string;
        correlationId: string;
      }) => Promise<void> | void;
    };
  }

  interface FastifyRequest {
    user: AuthenticatedUser | null;
    session: { id: string } | null;
    telemetry: { traceId: string; startedAt: bigint } | null;
    authorize(requiredRoles?: string[]): void;
  }

  interface FastifyContextConfig {
    public?: boolean;
    requiredRoles?: string[];
  }
}

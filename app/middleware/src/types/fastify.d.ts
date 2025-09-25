import 'fastify';
import type { config } from '../config/index.js';
import type { Datastore } from '../plugins/datastore.js';

type ConfigShape = typeof config;

declare module 'fastify' {
  interface FastifyInstance {
    config: ConfigShape;
    datastore: Datastore;
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
}

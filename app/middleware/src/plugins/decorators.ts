import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

type TransferIntent = {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  note?: string;
  correlationId: string;
};

type CreditApplicationIntent = {
  applicationId: string;
  playerId: string;
  accountId: string;
  requestedLimit: number;
  currency: string;
  justification: string;
  collateralType?: string;
  attachments?: string[];
  correlationId: string;
};

type MarketOrderIntent = {
  orderId: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  limitPrice?: number;
  timeInForce?: string;
  correlationId: string;
};

function generateTransferId(source: string, destination: string) {
  return crypto
    .createHash('sha256')
    .update(`${source}:${destination}:${crypto.randomUUID()}`)
    .digest('hex');
}

function generateCreditApplicationId(playerId: string, accountId: string) {
  return crypto
    .createHash('sha256')
    .update(`credit:${playerId}:${accountId}:${crypto.randomUUID()}`)
    .digest('hex');
}

function generateMarketOrderId(accountId: string, symbol: string) {
  return crypto
    .createHash('sha256')
    .update(`order:${accountId}:${symbol}:${crypto.randomUUID()}`)
    .digest('hex');
}

async function logTransferIntent(this: FastifyInstance, intent: TransferIntent) {
  this.log.info(
    {
      event: 'transfer_intent',
      intent
    },
    'Transfer intent received'
  );
}

async function logCreditApplication(this: FastifyInstance, application: CreditApplicationIntent) {
  this.log.info(
    {
      event: 'credit_application_received',
      application
    },
    'Credit application received'
  );
}

async function logMarketOrder(this: FastifyInstance, order: MarketOrderIntent) {
  this.log.info(
    {
      event: 'market_order_received',
      order
    },
    'Market order received'
  );
}

export const decoratorPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('config', config);

  app.decorate('utils', {
    generateTransferId,
    generateCreditApplicationId,
    generateMarketOrderId,
    logTransferIntent: logTransferIntent.bind(app),
    logCreditApplication: logCreditApplication.bind(app),
    logMarketOrder: logMarketOrder.bind(app)
  });
});

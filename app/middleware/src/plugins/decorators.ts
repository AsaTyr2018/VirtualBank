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

function generateTransferId(source: string, destination: string) {
  return crypto
    .createHash('sha256')
    .update(`${source}:${destination}:${crypto.randomUUID()}`)
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

export const decoratorPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('config', config);

  app.decorate('utils', {
    generateTransferId,
    logTransferIntent: logTransferIntent.bind(app)
  });
});

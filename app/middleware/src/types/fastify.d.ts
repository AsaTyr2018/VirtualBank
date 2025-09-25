import 'fastify';
import type { config } from '../config/index.js';

type ConfigShape = typeof config;

declare module 'fastify' {
  interface FastifyInstance {
    config: ConfigShape;
    utils: {
      generateTransferId: (sourceAccountId: string, destinationAccountId: string) => string;
      logTransferIntent: (intent: {
        transferId: string;
        sourceAccountId: string;
        destinationAccountId: string;
        amount: number;
        currency: string;
        note?: string;
        correlationId: string;
      }) => Promise<void> | void;
    };
  }
}

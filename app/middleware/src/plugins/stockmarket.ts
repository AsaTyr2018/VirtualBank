import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

type SubmitOrderResponse = {
  order: {
    order_id: string;
    status: string;
    remaining_quantity: number;
  };
  fills: unknown[];
};

export interface StockmarketOrderCommand {
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  limitPrice?: number;
}

export interface QuoteStreamOptions<T = unknown> {
  onSnapshot?(snapshot: T): void;
  onUpdate?(update: T): void;
  onError?(error: Error): void;
}

export interface QuoteStream {
  close(): Promise<void>;
}

export interface StockmarketClient {
  submitOrder(command: StockmarketOrderCommand): Promise<SubmitOrderResponse>;
  streamQuotes<T = unknown>(options: QuoteStreamOptions<T>): Promise<QuoteStream>;
}

function uppercaseSide(side: StockmarketOrderCommand['side']): 'BUY' | 'SELL' {
  return side.toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
}

function mapOrderType(type: StockmarketOrderCommand['orderType']): 'market' | 'limit' {
  return type === 'market' ? 'market' : 'limit';
}

function createDisabledClient(app: FastifyInstance): StockmarketClient {
  return {
    async submitOrder(command) {
      app.log.warn({ command }, 'Stockmarket client disabled; skipping order submission');
      return {
        order: {
          order_id: command.accountId,
          status: 'SKIPPED',
          remaining_quantity: 0
        },
        fills: []
      };
    },
    async streamQuotes() {
      app.log.warn('Stockmarket client disabled; returning no-op stream');
      return {
        async close() {}
      };
    }
  };
}

function createStockmarketClient(app: FastifyInstance): StockmarketClient {
  const { stockmarket } = app.config;

  return {
    async submitOrder(command) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), stockmarket.requestTimeoutMs);

      try {
        const response = await fetch(`${stockmarket.baseUrl.replace(/\/$/, '')}/api/v1/orders`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            user_id: command.accountId,
            symbol: command.symbol,
            side: uppercaseSide(command.side),
            order_type: mapOrderType(command.orderType),
            quantity: Math.max(1, Math.round(command.quantity)),
            price: command.orderType === 'limit' ? command.limitPrice : undefined
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Stockmarket order rejected: ${response.status} ${text}`);
        }

        return (await response.json()) as SubmitOrderResponse;
      } catch (error) {
        app.log.error({ err: error, command }, 'Stockmarket order submission failed');
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    async streamQuotes<T = unknown>(options: QuoteStreamOptions<T>) {
      const url = stockmarket.wsUrl ?? `${stockmarket.baseUrl.replace('http', 'ws')}/ws/ticks`;
      const socket = new WebSocket(url);

      socket.on('message', (data: WebSocket.RawData) => {
        try {
          const payload = JSON.parse(data.toString()) as { type: string; data?: T };
          if (payload.type === 'snapshot') {
            options.onSnapshot?.(payload.data as T);
          } else {
            options.onUpdate?.((payload.data ?? payload) as T);
          }
        } catch (error) {
          options.onError?.(error as Error);
        }
      });

      socket.on('error', (error) => {
        options.onError?.(error as Error);
        app.log.error({ err: error }, 'Stockmarket WebSocket error');
      });

      return {
        async close() {
          return new Promise<void>((resolve) => {
            socket.once('close', () => resolve());
            socket.close();
          });
        }
      };
    }
  };
}

export const stockmarketPlugin = fp(async (app: FastifyInstance) => {
  const { stockmarket } = app.config;

  if (!stockmarket.baseUrl) {
    app.log.warn('Stockmarket bridge disabled: no base URL configured');
    app.decorate('stockmarket', createDisabledClient(app));
    return;
  }

  app.decorate('stockmarket', createStockmarketClient(app));
}, { name: 'stockmarketPlugin' });

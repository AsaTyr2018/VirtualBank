import { Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { recordMarketOrder } from '../services/market.js';

const MarketOrderRequest = Type.Object({
  accountId: Type.String({ minLength: 1 }),
  symbol: Type.String({ minLength: 1, maxLength: 12 }),
  side: Type.Union([Type.Literal('buy'), Type.Literal('sell')]),
  orderType: Type.Union([Type.Literal('market'), Type.Literal('limit')]),
  quantity: Type.Number({ exclusiveMinimum: 0 }),
  limitPrice: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  timeInForce: Type.Optional(Type.String({ minLength: 2, maxLength: 3 }))
});

type MarketOrderRequestType = Static<typeof MarketOrderRequest>;

const MarketOrderResponse = Type.Object({
  orderId: Type.String(),
  status: Type.Literal('accepted'),
  statusUrl: Type.String({ format: 'uri' })
});

export async function marketRoutes(app: FastifyInstance) {
  app.post<{ Body: MarketOrderRequestType }>(
    '/api/v1/market/orders',
    {
      config: {
        requiredRoles: ['market:orders:write']
      },
      schema: {
        body: MarketOrderRequest,
        response: {
          202: MarketOrderResponse
        }
      }
    },
    async (request, reply) => {
      const { body } = request;

      if (body.orderType === 'limit' && typeof body.limitPrice !== 'number') {
        throw app.httpErrors.badRequest('limitPrice is required for limit orders.');
      }

      const orderId = app.utils.generateMarketOrderId(body.accountId, body.symbol);
      const statusUrl = `${app.config.publicBaseUrl}/api/v1/market/orders/${orderId}`;

      await app.utils.logMarketOrder({
        orderId,
        accountId: body.accountId,
        symbol: body.symbol,
        side: body.side,
        orderType: body.orderType,
        quantity: body.quantity,
        limitPrice: body.limitPrice,
        timeInForce: body.timeInForce,
        correlationId: request.id
      });

      await recordMarketOrder(app.datastore, {
        orderId,
        accountId: body.accountId,
        symbol: body.symbol,
        side: body.side,
        orderType: body.orderType,
        quantity: body.quantity,
        limitPrice: body.limitPrice,
        timeInForce: body.timeInForce
      });

      return reply.code(202).send({
        orderId,
        status: 'accepted',
        statusUrl
      });
    }
  );
}

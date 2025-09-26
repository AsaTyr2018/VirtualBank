import { Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { createTransferWorkflow, getTransferStatus } from '../services/transfers.js';

const TransferRequest = Type.Object({
  sourceAccountId: Type.String({ minLength: 1 }),
  destinationAccountId: Type.String({ minLength: 1 }),
  amount: Type.Number({ exclusiveMinimum: 0 }),
  currency: Type.String({ minLength: 3, maxLength: 3 }),
  note: Type.Optional(Type.String({ maxLength: 256 }))
});

type TransferRequestType = Static<typeof TransferRequest>;

const TransferResponse = Type.Object({
  transferId: Type.String(),
  status: Type.Literal('accepted'),
  statusUrl: Type.String({ format: 'uri' })
});

const TransferStatusResponse = Type.Object({
  transferId: Type.String(),
  status: Type.String(),
  steps: Type.Array(
    Type.Object({
      name: Type.String(),
      status: Type.String(),
      occurredAt: Type.String({ format: 'date-time' })
    })
  )
});

type TransferParams = { id: string };

export async function transferRoutes(app: FastifyInstance) {
  app.post<{ Body: TransferRequestType }>(
    '/api/v1/transfers',
    {
      config: {
        requiredRoles: ['bank:transfers:write']
      },
      schema: {
        body: TransferRequest,
        response: {
          202: TransferResponse
        }
      }
    },
    async (request, reply) => {
      const { body } = request;

      const transferId = app.utils.generateTransferId(body.sourceAccountId, body.destinationAccountId);
      const statusUrl = `${app.config.publicBaseUrl}/api/v1/transfers/${transferId}`;

      await app.utils.logTransferIntent({
        transferId,
        sourceAccountId: body.sourceAccountId,
        destinationAccountId: body.destinationAccountId,
        amount: body.amount,
        currency: body.currency,
        note: body.note,
        correlationId: request.id
      });

      await createTransferWorkflow(
        { datastore: app.datastore, cache: app.cache, events: app.events },
        {
          transferId,
          sourceAccountId: body.sourceAccountId,
          destinationAccountId: body.destinationAccountId,
          amount: body.amount,
          currency: body.currency,
          note: body.note
        },
        {
          correlationId: request.id,
          sessionId: request.session?.id
        }
      );

      return reply
        .code(202)
        .send({
          transferId,
          status: 'accepted',
          statusUrl
        });
    }
  );

  app.get<{ Params: TransferParams }>(
    '/api/v1/transfers/:id',
    {
      config: {
        requiredRoles: ['bank:transfers:read']
      },
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: {
          200: TransferStatusResponse
        }
      }
    },
    async (request) => {
      const transfer = await getTransferStatus(
        { datastore: app.datastore, cache: app.cache, events: app.events },
        request.params.id
      );

      if (!transfer) {
        throw app.httpErrors.notFound('Transfer not found');
      }

      return transfer;
    }
  );
}

import { Static, Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { submitCreditApplication } from '../services/credits.js';

const CreditApplicationRequest = Type.Object({
  playerId: Type.String({ minLength: 1 }),
  accountId: Type.String({ minLength: 1 }),
  requestedLimit: Type.Number({ exclusiveMinimum: 0 }),
  currency: Type.String({ minLength: 3, maxLength: 3 }),
  justification: Type.String({ minLength: 1, maxLength: 1024 }),
  collateralType: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  attachments: Type.Optional(Type.Array(Type.String({ format: 'uri' }), { maxItems: 5 }))
});

type CreditApplicationRequestType = Static<typeof CreditApplicationRequest>;

const CreditApplicationResponse = Type.Object({
  applicationId: Type.String(),
  status: Type.Literal('received'),
  reviewUrl: Type.String({ format: 'uri' }),
  estimatedDecisionSeconds: Type.Number({ minimum: 0 })
});

export async function creditRoutes(app: FastifyInstance) {
  app.post<{ Body: CreditApplicationRequestType }>(
    '/api/v1/credits/applications',
    {
      config: {
        requiredRoles: ['bank:credits:write']
      },
      schema: {
        body: CreditApplicationRequest,
        response: {
          202: CreditApplicationResponse
        }
      }
    },
    async (request, reply) => {
      const { body } = request;

      const applicationId = app.utils.generateCreditApplicationId(body.playerId, body.accountId);
      const reviewUrl = `${app.config.publicBaseUrl}/api/v1/credits/applications/${applicationId}`;

      await app.utils.logCreditApplication({
        applicationId,
        playerId: body.playerId,
        accountId: body.accountId,
        requestedLimit: body.requestedLimit,
        currency: body.currency,
        justification: body.justification,
        collateralType: body.collateralType,
        attachments: body.attachments,
        correlationId: request.id
      });

      await submitCreditApplication(app.datastore, {
        applicationId,
        playerId: body.playerId,
        accountId: body.accountId,
        requestedLimit: body.requestedLimit,
        currency: body.currency,
        justification: body.justification,
        collateralType: body.collateralType,
        attachments: body.attachments
      });

      return reply.code(202).send({
        applicationId,
        status: 'received',
        reviewUrl,
        estimatedDecisionSeconds: 3600
      });
    }
  );
}

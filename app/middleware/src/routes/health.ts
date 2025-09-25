import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

const LiveResponse = Type.Object({
  status: Type.Literal('ok'),
  service: Type.Literal('middleware'),
  uptimeMs: Type.Number()
});

const DependencyStatus = Type.Object({
  status: Type.Union([Type.Literal('connected'), Type.Literal('error')]),
  latencyMs: Type.Optional(Type.Number()),
  error: Type.Optional(Type.String())
});

const ReadyResponse = Type.Object({
  status: Type.Union([Type.Literal('ok'), Type.Literal('error')]),
  service: Type.Literal('middleware'),
  uptimeMs: Type.Number(),
  dependencies: Type.Object({
    datastore: DependencyStatus
  })
});

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health/live', {
    schema: {
      response: {
        200: LiveResponse
      }
    }
  }, async () => ({
    status: 'ok',
    service: 'middleware',
    uptimeMs: Math.round(process.uptime() * 1000)
  }));

  app.get('/health/ready', {
    schema: {
      response: {
        200: ReadyResponse,
        503: ReadyResponse
      }
    }
  }, async (request, reply) => {
    const base = {
      service: 'middleware' as const,
      uptimeMs: Math.round(process.uptime() * 1000)
    };

    try {
      const datastore = await app.datastore.healthCheck();
      return {
        status: 'ok' as const,
        ...base,
        dependencies: {
          datastore: {
            status: 'connected' as const,
            latencyMs: datastore.latencyMs
          }
        }
      };
    } catch (error) {
      app.log.error(error, 'Datastore readiness check failed');
      return reply.code(503).send({
        status: 'error' as const,
        ...base,
        dependencies: {
          datastore: {
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      });
    }
  });
}

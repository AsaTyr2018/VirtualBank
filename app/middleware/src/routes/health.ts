import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health/live', {
    schema: {
      response: {
        200: Type.Object({
          status: Type.Literal('ok'),
          service: Type.Literal('middleware'),
          uptimeMs: Type.Number()
        })
      }
    }
  }, async () => ({
    status: 'ok',
    service: 'middleware',
    uptimeMs: Math.round(process.uptime() * 1000)
  }));
}

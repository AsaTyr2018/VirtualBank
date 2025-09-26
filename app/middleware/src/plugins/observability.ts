import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import { Type } from '@sinclair/typebox';

type TelemetryState = {
  traceId: string;
  startedAt: bigint;
};

export const observabilityPlugin = fp(async (fastify: FastifyInstance) => {
  if (fastify.config.observability.metrics.enabled) {
    const registry = new Registry();
    collectDefaultMetrics({ register: registry });

    const httpRequestDuration = new Histogram({
      name: 'virtualbank_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [registry],
      buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
    });

    const httpRequestErrors = new Counter({
      name: 'virtualbank_http_request_errors_total',
      help: 'Total HTTP request errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [registry]
    });

    fastify.decorate('metrics', {
      registry,
      httpRequestDuration,
      httpRequestErrors
    });

    fastify.decorateRequest('telemetry', null);

    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      const traceId = (request.headers['x-trace-id'] as string | undefined) ?? crypto.randomUUID();
      const telemetry: TelemetryState = {
        traceId,
        startedAt: process.hrtime.bigint()
      };

      request.telemetry = telemetry;
      request.log = request.log.child({ traceId });

      request.log.info(
        {
          event: 'request.received',
          method: request.method,
          url: request.url
        },
        'Request received'
      );
    });

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const routeLabel = request.routeOptions?.url ?? request.url;
      const labels = {
        method: request.method,
        route: routeLabel,
        status_code: String(reply.statusCode)
      };

      if (request.telemetry) {
        const durationNs = process.hrtime.bigint() - request.telemetry.startedAt;
        const durationSeconds = Number(durationNs) / 1_000_000_000;
        fastify.metrics.httpRequestDuration.observe(labels, durationSeconds);
      }

      request.log.info(
        {
          event: 'request.completed',
          statusCode: reply.statusCode,
          route: routeLabel
        },
        'Request completed'
      );
    });

    fastify.setErrorHandler(async (error, request, reply) => {
      const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
      const routeLabel = request.routeOptions?.url ?? request.url;

      fastify.metrics.httpRequestErrors.inc({
        method: request.method,
        route: routeLabel,
        status_code: String(statusCode)
      });

      request.log.error({ err: error, route: routeLabel }, 'Request failed');

      if (!reply.sent) {
        reply.status(statusCode).send({
          statusCode,
          error: error.name ?? 'Error',
          message: error.message ?? 'Unexpected error'
        });
      }
    });

    fastify.get(
      '/internal/metrics',
      {
        config: {
          requiredRoles: ['system:metrics:read']
        },
        schema: {
          response: {
            200: Type.String({ description: 'Prometheus metrics exposition format' })
          }
        }
      },
      async (request, reply) => {
        request.authorize(['system:metrics:read']);
        reply.header('content-type', fastify.metrics.registry.contentType);
        return fastify.metrics.registry.metrics();
      }
    );
  }
});

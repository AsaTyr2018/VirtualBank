import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';

export interface IdempotencyPluginOptions {
  header?: string;
  ttlSeconds: number;
}

interface CacheEntry {
  checksum: string;
  statusCode: number;
  body: unknown;
  expiresAt: number;
}

function makeChecksum(payload: unknown): string {
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return crypto.createHash('sha256').update(json).digest('hex');
}

export const idempotencyPlugin = fp<IdempotencyPluginOptions>(
  async (fastify: FastifyInstance, options) => {
    const header = options.header ?? 'idempotency-key';
    const cache = new Map<string, CacheEntry>();

    fastify.addHook('preHandler', async (request, reply) => {
      const key = request.headers[header] as string | undefined;
      if (!key) {
        return;
      }

      const entry = cache.get(key);
      if (!entry) {
        return;
      }

      const now = Date.now();
      if (entry.expiresAt < now) {
        cache.delete(key);
        return;
      }

      const checksum = makeChecksum(request.body);
      if (checksum !== entry.checksum) {
        fastify.log.warn({ key }, 'Idempotency key replay attempted with different payload');
        throw fastify.httpErrors.badRequest('Idempotency key has already been used with a different payload.');
      }

      reply.code(entry.statusCode);
      await reply.send(entry.body);
      return reply;
    });

    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
      const key = request.headers[header] as string | undefined;
      if (!key) {
        return payload;
      }

      const checksum = makeChecksum(request.body);
      cache.set(key, {
        checksum,
        statusCode: reply.statusCode,
        body: payload,
        expiresAt: Date.now() + options.ttlSeconds * 1000
      });

      return payload;
    });
  },
  {
    name: 'idempotencyPlugin'
  }
);

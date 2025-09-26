import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';

export interface IdempotencyPluginOptions {
  header?: string;
  ttlSeconds: number;
}

interface IdempotencyRow {
  checksum: string;
  response_status: number | null;
  response_body: unknown | null;
  expires_at: Date;
}

function makeChecksum(payload: unknown): string {
  const json = JSON.stringify(payload ?? {});
  return crypto.createHash('sha256').update(json).digest('hex');
}

async function sendStoredResponse(
  reply: FastifyReply,
  row: Pick<IdempotencyRow, 'response_status' | 'response_body'>
) {
  if (row.response_status !== null) {
    reply.code(row.response_status);
  }

  reply.header('x-idempotent-replay', 'true');
  await reply.send(row.response_body);
}

function normalizePayload(payload: unknown): string {
  if (typeof payload === 'string') {
    try {
      JSON.parse(payload);
      return payload;
    } catch (error) {
      return JSON.stringify(payload);
    }
  }

  return JSON.stringify(payload ?? null);
}

export const idempotencyPlugin = fp<IdempotencyPluginOptions>(
  async (fastify: FastifyInstance, options) => {
    const header = options.header ?? 'idempotency-key';

    fastify.addHook('preHandler', async (request, reply) => {
      const key = request.headers[header] as string | undefined;
      if (!key) {
        return;
      }

      const checksum = makeChecksum(request.body);
      const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000).toISOString();
      const client = await fastify.datastore.pool.connect();

      try {
        await client.query('BEGIN');
        const existing = await client.query<IdempotencyRow>(
          'SELECT checksum, response_status, response_body, expires_at FROM idempotency_keys WHERE idempotency_key = $1 FOR UPDATE',
          [key]
        );

        if (existing.rowCount === 0) {
          await client.query(
            'INSERT INTO idempotency_keys (idempotency_key, checksum, response_status, response_body, expires_at) VALUES ($1, $2, NULL, NULL, $3)',
            [key, checksum, expiresAt]
          );
          await client.query('COMMIT');
          return;
        }

        const row = existing.rows[0];
        const now = new Date();

        if (new Date(row.expires_at).getTime() <= now.getTime()) {
          await client.query('DELETE FROM idempotency_keys WHERE idempotency_key = $1', [key]);
          await client.query(
            'INSERT INTO idempotency_keys (idempotency_key, checksum, response_status, response_body, expires_at) VALUES ($1, $2, NULL, NULL, $3)',
            [key, checksum, expiresAt]
          );
          await client.query('COMMIT');
          return;
        }

        if (row.checksum !== checksum) {
          await client.query('ROLLBACK');
          fastify.log.warn({ key }, 'Idempotency key replay attempted with different payload');
          throw fastify.httpErrors.badRequest(
            'Idempotency key has already been used with a different payload.'
          );
        }

        if (row.response_status !== null) {
          await client.query('COMMIT');
          await sendStoredResponse(reply, row);
          return reply;
        }

        await client.query('COMMIT');
        throw fastify.httpErrors.conflict('Idempotent request is already being processed.');
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          fastify.log.error(rollbackError, 'Failed rolling back idempotency transaction');
        }
        throw error;
      } finally {
        client.release();
      }
    });

    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
      const key = request.headers[header] as string | undefined;
      if (!key) {
        return payload;
      }

      const checksum = makeChecksum(request.body);
      const serialized = normalizePayload(payload);
      const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000).toISOString();

      try {
        const result = await fastify.datastore.query(
          'UPDATE idempotency_keys SET checksum = $2, response_status = $3, response_body = $4::jsonb, expires_at = $5 WHERE idempotency_key = $1',
          [key, checksum, reply.statusCode, serialized, expiresAt]
        );

        if (result.rowCount === 0) {
          fastify.log.warn({ key }, 'Idempotency key was not initialized before attempting to persist response');
        }
      } catch (error) {
        fastify.log.error(error, 'Failed to persist idempotent response payload');
      }

      return payload;
    });
  },
  {
    name: 'idempotencyPlugin',
    dependencies: ['datastorePlugin']
  }
);

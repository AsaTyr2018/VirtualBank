import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { ensureSchema } from '../datastore/schema.js';

export type Datastore = {
  pool: Pool;
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  healthCheck(): Promise<{ status: 'connected'; latencyMs: number }>;
};

export const datastorePlugin = fp(async (app: FastifyInstance) => {
  const { datastore } = app.config;

  const poolConfig: PoolConfig = {
    max: datastore.pool.max,
    idleTimeoutMillis: datastore.pool.idleTimeoutMs,
    connectionTimeoutMillis: datastore.pool.connectionTimeoutMs
  };

  if (datastore.connectionString) {
    poolConfig.connectionString = datastore.connectionString;
  } else {
    poolConfig.host = datastore.host;
    poolConfig.port = datastore.port;
    poolConfig.user = datastore.user;
    poolConfig.password = datastore.password;
    poolConfig.database = datastore.database;
  }

  if (datastore.sslMode === 'require') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);

  pool.on('error', (error) => {
    app.log.error(error, 'Unexpected PostgreSQL client error detected');
  });

  const maxAttempts = Math.max(1, datastore.retry?.maxAttempts ?? 1);
  const retryDelayMs = Math.max(0, datastore.retry?.delayMs ?? 0);

  let connected = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      app.log.info({ attempt }, 'Connected to PostgreSQL datastore.');
      connected = true;
      break;
    } catch (error) {
      if (attempt >= maxAttempts) {
        app.log.error(error, 'Failed to connect to PostgreSQL datastore');
        throw error;
      }

      app.log.warn(
        { attempt, maxAttempts, retryDelayMs, error },
        'PostgreSQL datastore connection failed, retrying'
      );

      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  if (!connected) {
    throw new Error('Failed to establish PostgreSQL connection after retries');
  }

  const datastoreApi: Datastore = {
    pool,
    async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
      return pool.query<T>(text, params);
    },
    async healthCheck() {
      const start = process.hrtime.bigint();
      await pool.query('SELECT 1');
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { status: 'connected', latencyMs: duration };
    }
  };

  app.log.info('Ensuring PostgreSQL datastore schema...');

  await ensureSchema(datastoreApi);

  app.log.info('PostgreSQL datastore schema ensured.');

  app.decorate('datastore', datastoreApi);

  app.addHook('onClose', async (instance: FastifyInstance) => {
    if (instance === app) {
      await pool.end();
    }
  });
}, {
  name: 'datastorePlugin'
});

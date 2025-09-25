import { parseEnv } from './env.js';

const env = parseEnv(process.env);

export const config = {
  env: env.NODE_ENV ?? 'development',
  host: env.MIDDLEWARE_HOST ?? '0.0.0.0',
  port: Number(env.MIDDLEWARE_PORT ?? '8080'),
  rateLimit: {
    max: Number(env.RATE_LIMIT_MAX ?? '100'),
    timeWindow: env.RATE_LIMIT_TIME_WINDOW ?? '1 minute'
  },
  idempotency: {
    ttlSeconds: Number(env.IDEMPOTENCY_TTL_SECONDS ?? '600')
  },
  publicBaseUrl:
    env.PUBLIC_BASE_URL ?? `http://${env.MIDDLEWARE_HOST ?? '0.0.0.0'}:${env.MIDDLEWARE_PORT ?? '8080'}`,
  sessionStream: {
    heartbeatSeconds: Number(env.SESSION_STREAM_HEARTBEAT_SECONDS ?? '30')
  },
  datastore: {
    connectionString: env.DATASTORE_URL,
    host: env.DATASTORE_HOST ?? 'localhost',
    port: Number(env.DATASTORE_PORT ?? '5432'),
    user: env.DATASTORE_USER ?? 'vb_app',
    password: env.DATASTORE_PASSWORD ?? 'vb_app_password',
    database: env.DATASTORE_DATABASE ?? 'virtualbank',
    sslMode: env.DATASTORE_SSL_MODE ?? 'disable',
    pool: {
      max: Number(env.DATASTORE_POOL_MAX ?? '10'),
      idleTimeoutMs: Number(env.DATASTORE_POOL_IDLE_MS ?? '10000'),
      connectionTimeoutMs: Number(env.DATASTORE_POOL_CONNECTION_TIMEOUT_MS ?? '5000')
    }
  }
} as const;

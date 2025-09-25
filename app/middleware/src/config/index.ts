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
  }
} as const;

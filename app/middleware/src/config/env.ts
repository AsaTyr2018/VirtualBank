import { Type, type Static } from '@sinclair/typebox';

const EnvSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.Union([
    Type.Literal('development'),
    Type.Literal('test'),
    Type.Literal('production')
  ])),
  MIDDLEWARE_HOST: Type.Optional(Type.String({ default: '0.0.0.0' })),
  MIDDLEWARE_PORT: Type.Optional(Type.String({ default: '8080' })),
  RATE_LIMIT_MAX: Type.Optional(Type.String({ default: '100' })),
  RATE_LIMIT_TIME_WINDOW: Type.Optional(Type.String({ default: '1 minute' })),
  IDEMPOTENCY_TTL_SECONDS: Type.Optional(Type.String({ default: '600' })),
  PUBLIC_BASE_URL: Type.Optional(Type.String()),
  SESSION_STREAM_HEARTBEAT_SECONDS: Type.Optional(Type.String({ default: '30' }))
});

export type EnvConfig = Static<typeof EnvSchema>;

export function parseEnv(env: NodeJS.ProcessEnv): EnvConfig {
  const result: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    if (key in EnvSchema.properties) {
      result[key] = value;
    }
  }

  return {
    NODE_ENV: (result.NODE_ENV as EnvConfig['NODE_ENV']) ?? 'development',
    MIDDLEWARE_HOST: result.MIDDLEWARE_HOST ?? '0.0.0.0',
    MIDDLEWARE_PORT: result.MIDDLEWARE_PORT ?? '8080',
    RATE_LIMIT_MAX: result.RATE_LIMIT_MAX ?? '100',
    RATE_LIMIT_TIME_WINDOW: result.RATE_LIMIT_TIME_WINDOW ?? '1 minute',
    IDEMPOTENCY_TTL_SECONDS: result.IDEMPOTENCY_TTL_SECONDS ?? '600',
    PUBLIC_BASE_URL: result.PUBLIC_BASE_URL,
    SESSION_STREAM_HEARTBEAT_SECONDS: result.SESSION_STREAM_HEARTBEAT_SECONDS ?? '30'
  };
}

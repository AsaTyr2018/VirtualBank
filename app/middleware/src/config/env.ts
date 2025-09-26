import { Type, type Static } from '@sinclair/typebox';

const EnvSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.Union([
    Type.Literal('development'),
    Type.Literal('test'),
    Type.Literal('production')
  ])),
  MIDDLEWARE_HOST: Type.Optional(Type.String({ default: '0.0.0.0' })),
  MIDDLEWARE_PORT: Type.Optional(Type.String({ default: '8080' })),
  MIDDLEWARE_PLUGIN_TIMEOUT_MS: Type.Optional(Type.String({ default: '60000' })),
  RATE_LIMIT_MAX: Type.Optional(Type.String({ default: '100' })),
  RATE_LIMIT_TIME_WINDOW: Type.Optional(Type.String({ default: '1 minute' })),
  IDEMPOTENCY_TTL_SECONDS: Type.Optional(Type.String({ default: '600' })),
  PUBLIC_BASE_URL: Type.Optional(Type.String()),
  SESSION_STREAM_HEARTBEAT_SECONDS: Type.Optional(Type.String({ default: '30' })),
  DATASTORE_URL: Type.Optional(Type.String()),
  DATASTORE_HOST: Type.Optional(Type.String({ default: 'localhost' })),
  DATASTORE_PORT: Type.Optional(Type.String({ default: '5432' })),
  DATASTORE_USER: Type.Optional(Type.String({ default: 'vb_app' })),
  DATASTORE_PASSWORD: Type.Optional(Type.String({ default: 'vb_app_password' })),
  DATASTORE_DATABASE: Type.Optional(Type.String({ default: 'virtualbank' })),
  DATASTORE_SSL_MODE: Type.Optional(
    Type.Union([Type.Literal('disable'), Type.Literal('require')], { default: 'disable' })
  ),
  DATASTORE_POOL_MAX: Type.Optional(Type.String({ default: '10' })),
  DATASTORE_POOL_IDLE_MS: Type.Optional(Type.String({ default: '10000' })),
  DATASTORE_POOL_CONNECTION_TIMEOUT_MS: Type.Optional(Type.String({ default: '5000' })),
  DATASTORE_CONNECT_MAX_RETRIES: Type.Optional(Type.String({ default: '5' })),
  DATASTORE_CONNECT_RETRY_DELAY_MS: Type.Optional(Type.String({ default: '2000' })),
  EVENTS_ENABLED: Type.Optional(Type.String({ default: 'true' })),
  EVENTS_CLIENT_ID: Type.Optional(Type.String({ default: 'virtualbank-middleware' })),
  EVENTS_BROKERS: Type.Optional(Type.String({ default: 'localhost:9092' })),
  EVENTS_TOPIC_PREFIX: Type.Optional(Type.String({ default: 'virtualbank' })),
  CACHE_ENABLED: Type.Optional(Type.String({ default: 'true' })),
  CACHE_URL: Type.Optional(Type.String()),
  CACHE_HOST: Type.Optional(Type.String({ default: 'localhost' })),
  CACHE_PORT: Type.Optional(Type.String({ default: '6379' })),
  CACHE_PASSWORD: Type.Optional(Type.String()),
  CACHE_TLS: Type.Optional(Type.String({ default: 'false' })),
  CACHE_DEFAULT_TTL_SECONDS: Type.Optional(Type.String({ default: '30' })),
  STOCKMARKET_BASE_URL: Type.Optional(Type.String({ default: 'http://vb-stockmarket:8100' })),
  STOCKMARKET_WS_URL: Type.Optional(Type.String()),
  STOCKMARKET_TIMEOUT_MS: Type.Optional(Type.String({ default: '5000' })),
  AUTH_API_KEYS: Type.Optional(Type.String()),
  AUTH_API_KEY_HEADER: Type.Optional(Type.String({ default: 'x-api-key' })),
  AUTH_SESSION_HEADER: Type.Optional(Type.String({ default: 'x-session-id' }))
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
    MIDDLEWARE_PLUGIN_TIMEOUT_MS: result.MIDDLEWARE_PLUGIN_TIMEOUT_MS ?? '60000',
    RATE_LIMIT_MAX: result.RATE_LIMIT_MAX ?? '100',
    RATE_LIMIT_TIME_WINDOW: result.RATE_LIMIT_TIME_WINDOW ?? '1 minute',
    IDEMPOTENCY_TTL_SECONDS: result.IDEMPOTENCY_TTL_SECONDS ?? '600',
    PUBLIC_BASE_URL: result.PUBLIC_BASE_URL,
    SESSION_STREAM_HEARTBEAT_SECONDS: result.SESSION_STREAM_HEARTBEAT_SECONDS ?? '30',
    DATASTORE_URL: result.DATASTORE_URL,
    DATASTORE_HOST: result.DATASTORE_HOST ?? 'localhost',
    DATASTORE_PORT: result.DATASTORE_PORT ?? '5432',
    DATASTORE_USER: result.DATASTORE_USER ?? 'vb_app',
    DATASTORE_PASSWORD: result.DATASTORE_PASSWORD ?? 'vb_app_password',
    DATASTORE_DATABASE: result.DATASTORE_DATABASE ?? 'virtualbank',
    DATASTORE_SSL_MODE: (result.DATASTORE_SSL_MODE as EnvConfig['DATASTORE_SSL_MODE']) ?? 'disable',
    DATASTORE_POOL_MAX: result.DATASTORE_POOL_MAX ?? '10',
    DATASTORE_POOL_IDLE_MS: result.DATASTORE_POOL_IDLE_MS ?? '10000',
    DATASTORE_POOL_CONNECTION_TIMEOUT_MS: result.DATASTORE_POOL_CONNECTION_TIMEOUT_MS ?? '5000',
    DATASTORE_CONNECT_MAX_RETRIES: result.DATASTORE_CONNECT_MAX_RETRIES ?? '5',
    DATASTORE_CONNECT_RETRY_DELAY_MS: result.DATASTORE_CONNECT_RETRY_DELAY_MS ?? '2000',
    EVENTS_ENABLED: result.EVENTS_ENABLED ?? 'true',
    EVENTS_CLIENT_ID: result.EVENTS_CLIENT_ID ?? 'virtualbank-middleware',
    EVENTS_BROKERS: result.EVENTS_BROKERS ?? 'localhost:9092',
    EVENTS_TOPIC_PREFIX: result.EVENTS_TOPIC_PREFIX ?? 'virtualbank',
    CACHE_ENABLED: result.CACHE_ENABLED ?? 'true',
    CACHE_URL: result.CACHE_URL,
    CACHE_HOST: result.CACHE_HOST ?? 'localhost',
    CACHE_PORT: result.CACHE_PORT ?? '6379',
    CACHE_PASSWORD: result.CACHE_PASSWORD,
    CACHE_TLS: result.CACHE_TLS ?? 'false',
    CACHE_DEFAULT_TTL_SECONDS: result.CACHE_DEFAULT_TTL_SECONDS ?? '30',
    STOCKMARKET_BASE_URL: result.STOCKMARKET_BASE_URL ?? 'http://vb-stockmarket:8100',
    STOCKMARKET_WS_URL: result.STOCKMARKET_WS_URL,
    STOCKMARKET_TIMEOUT_MS: result.STOCKMARKET_TIMEOUT_MS ?? '5000',
    AUTH_API_KEYS: result.AUTH_API_KEYS,
    AUTH_API_KEY_HEADER: result.AUTH_API_KEY_HEADER ?? 'x-api-key',
    AUTH_SESSION_HEADER: result.AUTH_SESSION_HEADER ?? 'x-session-id'
  };
}

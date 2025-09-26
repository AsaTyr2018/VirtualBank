import { parseEnv } from './env.js';

const env = parseEnv(process.env);

type ApiKeyConfig = {
  id: string;
  secret: string;
  roles: string[];
};

function parseApiKeys(rawValue: string | undefined): ApiKeyConfig[] {
  if (!rawValue || rawValue.trim().length === 0) {
    return [
      {
        id: 'sandbox-service',
        secret: 'sandbox-secret',
        roles: [
          'bank:transfers:read',
          'bank:transfers:write',
          'bank:credits:write',
          'market:orders:write',
          'sessions:stream:subscribe',
          'system:metrics:read'
        ]
      }
    ];
  }

  const entries = rawValue.split(',');

  const parsed: ApiKeyConfig[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const [id, secret, rolesPart] = trimmed.split(':');
    if (!id || !secret) {
      continue;
    }

    const roles = rolesPart ? rolesPart.split('|').map((role) => role.trim()).filter(Boolean) : [];

    parsed.push({
      id,
      secret,
      roles
    });
  }

  return parsed.length > 0
    ? parsed
    : [
        {
          id: 'sandbox-service',
          secret: 'sandbox-secret',
          roles: [
            'bank:transfers:read',
            'bank:transfers:write',
            'bank:credits:write',
            'market:orders:write',
            'sessions:stream:subscribe',
            'system:metrics:read'
          ]
        }
      ];
}

export const config = {
  env: env.NODE_ENV ?? 'development',
  host: env.MIDDLEWARE_HOST ?? '0.0.0.0',
  port: Number(env.MIDDLEWARE_PORT ?? '8080'),
  pluginTimeoutMs: Number(env.MIDDLEWARE_PLUGIN_TIMEOUT_MS ?? '60000'),
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
  auth: {
    apiKeyHeader: env.AUTH_API_KEY_HEADER ?? 'x-api-key',
    sessionHeader: env.AUTH_SESSION_HEADER ?? 'x-session-id',
    apiKeys: parseApiKeys(env.AUTH_API_KEYS)
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
    },
    retry: {
      maxAttempts: Number(env.DATASTORE_CONNECT_MAX_RETRIES ?? '5'),
      delayMs: Number(env.DATASTORE_CONNECT_RETRY_DELAY_MS ?? '2000')
    }
  },
  events: {
    enabled: (env.EVENTS_ENABLED ?? 'true').toLowerCase() !== 'false',
    clientId: env.EVENTS_CLIENT_ID ?? 'virtualbank-middleware',
    brokers: (env.EVENTS_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
    topicPrefix: env.EVENTS_TOPIC_PREFIX ?? 'virtualbank'
  },
  cache: {
    enabled: (env.CACHE_ENABLED ?? 'true').toLowerCase() !== 'false',
    defaultTtlSeconds: Number(env.CACHE_DEFAULT_TTL_SECONDS ?? '30'),
    url: env.CACHE_URL,
    host: env.CACHE_HOST ?? 'localhost',
    port: Number(env.CACHE_PORT ?? '6379'),
    password: env.CACHE_PASSWORD,
    tls: (env.CACHE_TLS ?? 'false').toLowerCase() === 'true'
  },
  stockmarket: {
    baseUrl: env.STOCKMARKET_BASE_URL ?? 'http://vb-stockmarket:8100',
    wsUrl:
      env.STOCKMARKET_WS_URL ??
      (env.STOCKMARKET_BASE_URL
        ? env.STOCKMARKET_BASE_URL.replace('http', 'ws').replace(/\/?$/, '') + '/ws/ticks'
        : 'ws://vb-stockmarket:8100/ws/ticks'),
    requestTimeoutMs: Number(env.STOCKMARKET_TIMEOUT_MS ?? '5000')
  },
  observability: {
    metrics: {
      enabled: true
    },
    tracing: {
      enabled: true
    }
  }
} as const;

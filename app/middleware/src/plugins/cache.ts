import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

type CacheValue = string | null;

type RememberOptions<T> = {
  key: string;
  ttlSeconds?: number;
  loader: () => Promise<T>;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
};

export interface CacheClient {
  enabled: boolean;
  defaultTtlSeconds: number;
  get<T = unknown>(key: string, deserialize?: (raw: string) => T): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number, serialize?: (value: T) => string): Promise<void>;
  delete(key: string): Promise<void>;
  remember<T = unknown>(options: RememberOptions<T>): Promise<T>;
}

function createDisabledCache(app: FastifyInstance, defaultTtlSeconds: number): CacheClient {
  return {
    enabled: false,
    defaultTtlSeconds,
    async get() {
      return null;
    },
    async set() {
      app.log.debug('Cache disabled, skipping set');
    },
    async delete() {
      app.log.debug('Cache disabled, skipping delete');
    },
    async remember<T>({ loader }: RememberOptions<T>) {
      return loader();
    }
  };
}

function createRedisCache(app: FastifyInstance, redis: Redis, defaultTtlSeconds: number): CacheClient {
  return {
    enabled: true,
    defaultTtlSeconds,
    async get<T = unknown>(key: string, deserialize?: (raw: string) => T) {
      const value: CacheValue = await redis.get(key);
      if (value === null) {
        return null;
      }
      try {
        if (deserialize) {
          return deserialize(value);
        }
        return JSON.parse(value) as T;
      } catch (error) {
        app.log.warn({ err: error, key }, 'Failed to deserialize cache value');
        await redis.del(key);
        return null;
      }
    },
    async set<T = unknown>(key: string, value: T, ttlSeconds?: number, serialize?: (input: T) => string) {
      try {
        const payload = serialize ? serialize(value) : JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
          await redis.set(key, payload, 'EX', ttlSeconds);
        } else {
          await redis.set(key, payload);
        }
      } catch (error) {
        app.log.warn({ err: error, key }, 'Failed to serialize cache value');
      }
    },
    async delete(key: string) {
      await redis.del(key);
    },
    async remember<T>({ key, ttlSeconds, loader, serialize, deserialize }: RememberOptions<T>) {
      const cached = await this.get<T>(key, deserialize);
      if (cached !== null) {
        return cached;
      }
      const result = await loader();
      await this.set<T>(key, result, ttlSeconds ?? defaultTtlSeconds, serialize);
      return result;
    }
  };
}

export const cachePlugin = fp(async (app: FastifyInstance) => {
  const { cache } = app.config;

  if (!cache.enabled) {
    app.log.warn('Cache disabled via configuration');
    app.decorate('cache', createDisabledCache(app, cache.defaultTtlSeconds));
    return;
  }

  let redis: Redis;
  if (cache.url) {
    redis = new Redis(cache.url, {
      enableReadyCheck: true,
      lazyConnect: false
    });
  } else {
    redis = new Redis({
      host: cache.host,
      port: cache.port,
      password: cache.password,
      tls: cache.tls ? {} : undefined,
      enableReadyCheck: true,
      lazyConnect: false
    });
  }

  redis.on('error', (error: Error) => {
    app.log.error(error, 'Redis client error');
  });

  try {
    await redis.ping();
    app.log.info('Connected to Redis cache tier.');
  } catch (error) {
    app.log.error(error, 'Failed to connect to Redis cache tier');
    throw error;
  }

  const client = createRedisCache(app, redis, cache.defaultTtlSeconds);
  app.decorate('cache', client);

  app.addHook('onClose', async (instance: FastifyInstance) => {
    if (instance === app) {
      await redis.quit();
    }
  });
}, { name: 'cachePlugin' });

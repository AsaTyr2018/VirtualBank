import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import { decoratorPlugin } from './plugins/decorators.js';
import { datastorePlugin } from './plugins/datastore.js';
import { observabilityPlugin } from './plugins/observability.js';
import { authenticationPlugin } from './plugins/authentication.js';
import { idempotencyPlugin } from './plugins/idempotency.js';
import { cachePlugin } from './plugins/cache.js';
import { eventsPlugin } from './plugins/events.js';
import { stockmarketPlugin } from './plugins/stockmarket.js';
import { healthRoutes } from './routes/health.js';
import { transferRoutes } from './routes/transfers.js';
import { creditRoutes } from './routes/credits.js';
import { marketRoutes } from './routes/market.js';
import { sessionRoutes } from './routes/sessions.js';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.env === 'development' ? 'debug' : 'info',
      transport: config.env === 'development' ? { target: 'pino-pretty' } : undefined
    }
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(sensible);
  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow
  });
  await app.register(websocket);
  await app.register(decoratorPlugin);
  await app.register(datastorePlugin);
  await app.register(cachePlugin);
  await app.register(eventsPlugin);
  await app.register(stockmarketPlugin);
  await app.register(observabilityPlugin);
  await app.register(authenticationPlugin);
  await app.register(idempotencyPlugin, { ttlSeconds: config.idempotency.ttlSeconds });

  await app.register(healthRoutes);
  await app.register(transferRoutes);
  await app.register(creditRoutes);
  await app.register(marketRoutes);
  await app.register(sessionRoutes);

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({
      host: config.host,
      port: config.port
    });
  } catch (error) {
    app.log.error(error, 'Failed to start middleware server');
    process.exit(1);
  }
}

void start();

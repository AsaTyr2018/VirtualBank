import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify';
import type { WebsocketHandler } from '@fastify/websocket';
import type WebSocket from 'ws';

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export async function sessionRoutes(app: FastifyInstance) {
  const handler: WebsocketHandler = (connection: WebSocket, request: FastifyRequest) => {
    app.log.info({ event: 'session_stream_connected', correlationId: request.id }, 'Session stream subscribed');

    send(connection, {
      type: 'session.stream.ready',
      correlationId: request.id,
      acknowledgedAt: new Date().toISOString(),
      nextHeartbeatSeconds: app.config.sessionStream.heartbeatSeconds
    });

    const heartbeat = setInterval(() => {
      send(connection, {
        type: 'session.stream.heartbeat',
        emittedAt: new Date().toISOString()
      });
    }, app.config.sessionStream.heartbeatSeconds * 1000);

    const demoUpdateTimer = setTimeout(() => {
      send(connection, {
        type: 'session.stream.update',
        emittedAt: new Date().toISOString(),
        portfolio: {
          cashBalance: 1250.32,
          currency: 'VBC',
          holdings: [
            { symbol: 'SOLARX', quantity: 12, marketValue: 480.5 },
            { symbol: 'MECH-PRIME', quantity: 3, marketValue: 356.0 }
          ]
        },
        recentActivity: [
          { id: app.utils.generateTransferId('demo', 'player'), status: 'settled', occurredAt: new Date().toISOString() }
        ]
      });
    }, 1500);

    connection.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(demoUpdateTimer);
      app.log.info({ event: 'session_stream_disconnected', correlationId: request.id }, 'Session stream closed');
    });
  };

  app.get('/api/v1/sessions/stream', { websocket: true, config: { requiredRoles: ['sessions:stream:subscribe'] } }, handler);
}

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  apiKeyId: string;
  roles: string[];
  sessionId: string;
}

export const authenticationPlugin = fp(async (fastify: FastifyInstance) => {
  const { auth } = fastify.config;
  const secrets = new Map<string, { id: string; roles: string[] }>();

  for (const apiKey of auth.apiKeys) {
    secrets.set(apiKey.secret, { id: apiKey.id, roles: apiKey.roles });
  }

  fastify.decorate('auth', {
    getPrincipal(secret: string) {
      return secrets.get(secret);
    }
  });

  fastify.decorateRequest('user', null);
  fastify.decorateRequest('session', null);
  fastify.decorateRequest('authorize', function (this: FastifyRequest, requiredRoles: string[] = []) {
    if (!this.user) {
      throw fastify.httpErrors.unauthorized('Authentication required.');
    }

    const missing = requiredRoles.filter((role) => !this.user?.roles.includes(role));
    if (missing.length > 0) {
      throw fastify.httpErrors.forbidden(
        `Insufficient privileges. Missing roles: ${missing.sort().join(', ')}`
      );
    }
  });

  fastify.addHook('onRequest', async (request, reply) => {
    const routeConfig = (request.routeOptions?.config ?? {}) as {
      public?: boolean;
      requiredRoles?: string[];
    };

    if (routeConfig.public) {
      return;
    }

    const apiKey = request.headers[auth.apiKeyHeader] as string | undefined;
    if (!apiKey) {
      throw fastify.httpErrors.unauthorized('Missing API key header.');
    }

    const principal = secrets.get(apiKey);
    if (!principal) {
      throw fastify.httpErrors.unauthorized('Invalid API key.');
    }

    const sessionId = request.headers[auth.sessionHeader] as string | undefined;
    if (!sessionId || sessionId.trim().length === 0) {
      throw fastify.httpErrors.unauthorized('Missing session identifier header.');
    }

    request.user = {
      apiKeyId: principal.id,
      roles: principal.roles,
      sessionId
    } satisfies AuthenticatedUser;

    request.session = { id: sessionId };

    if (Array.isArray(routeConfig.requiredRoles) && routeConfig.requiredRoles.length > 0) {
      request.authorize(routeConfig.requiredRoles);
    }

    request.log.debug(
      {
        event: 'authentication.success',
        apiKeyId: principal.id,
        sessionId,
        roles: principal.roles
      },
      'Authenticated request'
    );
  });
});

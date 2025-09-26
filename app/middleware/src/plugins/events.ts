import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Kafka, type Producer, type Message } from 'kafkajs';
import { serializeDomainEvent, type DomainEvent } from '../services/domain-events.js';

export interface EventBridge {
  enabled: boolean;
  publish(event: DomainEvent): Promise<void>;
}

function createDisabledBridge(app: FastifyInstance): EventBridge {
  return {
    enabled: false,
    async publish(event: DomainEvent) {
      app.log.debug({ event }, 'Kafka bridge disabled, skipping publish');
    }
  };
}

function createKafkaBridge(app: FastifyInstance, producer: Producer, topicPrefix: string): EventBridge {
  return {
    enabled: true,
    async publish(event: DomainEvent) {
      const envelope = serializeDomainEvent(event);
      const topic = `${topicPrefix}.${event.type}`;
      const message: Message = {
        key: envelope.key,
        value: JSON.stringify(envelope.payload),
        headers: {
          'x-domain-event-type': event.type,
          'x-domain-event-version': envelope.version.toString(),
          'x-domain-event-timestamp': envelope.occurredAt
        }
      };

      try {
        await producer.send({
          topic,
          messages: [message]
        });
        app.log.debug({ topic, message }, 'Published domain event');
      } catch (error) {
        app.log.error({ err: error, topic }, 'Failed to publish domain event');
        throw error;
      }
    }
  };
}

export const eventsPlugin = fp(async (app: FastifyInstance) => {
  const { events } = app.config;

  if (!events.enabled || events.brokers.length === 0) {
    app.log.warn('Event bridge disabled via configuration');
    app.decorate('events', createDisabledBridge(app));
    return;
  }

  const kafka = new Kafka({
    clientId: events.clientId,
    brokers: events.brokers,
    retry: {
      retries: 5
    }
  });

  const producer = kafka.producer();

  try {
    await producer.connect();
    app.log.info('Connected to Kafka event bridge.');
  } catch (error) {
    app.log.error(error, 'Failed to connect Kafka producer');
    throw error;
  }

  const bridge = createKafkaBridge(app, producer, events.topicPrefix);
  app.decorate('events', bridge);

  app.addHook('onClose', async (instance: FastifyInstance) => {
    if (instance === app) {
      await producer.disconnect();
    }
  });
}, { name: 'eventsPlugin' });

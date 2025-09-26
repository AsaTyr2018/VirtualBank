import type { Datastore } from '../plugins/datastore.js';
import type { CacheClient } from '../plugins/cache.js';
import type { EventBridge } from '../plugins/events.js';
import { insertCreditApplication, insertTransactionEvent } from '../datastore/accessors.js';
import type { DomainEvent } from './domain-events.js';

export interface CreditApplicationInput {
  applicationId: string;
  playerId: string;
  accountId: string;
  requestedLimit: number;
  currency: string;
  justification: string;
  collateralType?: string;
  attachments?: string[];
}

export interface CreditApplicationDependencies {
  datastore: Datastore;
  cache: CacheClient;
  events: EventBridge;
}

export interface CreditApplicationContext {
  correlationId: string;
  sessionId?: string;
}

export async function submitCreditApplication(
  deps: CreditApplicationDependencies,
  input: CreditApplicationInput,
  context: CreditApplicationContext
): Promise<void> {
  const record = await insertCreditApplication(deps.datastore, {
    applicationId: input.applicationId,
    playerId: input.playerId,
    accountId: input.accountId,
    requestedLimit: input.requestedLimit,
    currency: input.currency,
    justification: input.justification,
    collateralType: input.collateralType,
    attachments: input.attachments,
    status: 'received'
  });

  await insertTransactionEvent(deps.datastore, {
    eventType: 'credits.received',
    resourceType: 'credit_application',
    resourceId: record.applicationId,
    payload: {
      applicationId: record.applicationId,
      accountId: record.accountId,
      playerId: record.playerId,
      requestedLimit: record.requestedLimit,
      currency: record.currency,
      correlationId: context.correlationId,
      sessionId: context.sessionId ?? null
    }
  });

  const event: DomainEvent = {
    type: 'credits.received',
    key: record.applicationId,
    version: 1,
    payload: {
      applicationId: record.applicationId,
      accountId: record.accountId,
      requestedLimit: record.requestedLimit,
      currency: record.currency,
      correlationId: context.correlationId,
      sessionId: context.sessionId ?? null
    }
  };

  await deps.cache.delete(`credit:${record.applicationId}`);
  await deps.events.publish(event);
}

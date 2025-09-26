import type { Datastore } from '../plugins/datastore.js';
import type { CacheClient } from '../plugins/cache.js';
import type { EventBridge } from '../plugins/events.js';
import {
  fetchTransfer,
  fetchTransferSteps,
  insertTransactionEvent,
  insertTransfer,
  insertTransferSteps
} from '../datastore/accessors.js';
import type { DomainEvent } from './domain-events.js';

export interface TransferWorkflowInput {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface TransferStatusStep {
  name: string;
  status: string;
  occurredAt: string;
}

export interface TransferStatusResponse {
  transferId: string;
  status: string;
  steps: TransferStatusStep[];
}

export interface TransferWorkflowDependencies {
  datastore: Datastore;
  cache: CacheClient;
  events: EventBridge;
}

export interface TransferWorkflowContext {
  correlationId: string;
  sessionId?: string;
}

export async function createTransferWorkflow(
  deps: TransferWorkflowDependencies,
  input: TransferWorkflowInput,
  context: TransferWorkflowContext
): Promise<TransferStatusResponse> {
  const client = await deps.datastore.pool.connect();
  const executor = { query: client.query.bind(client) as Datastore['query'] };
  const now = new Date().toISOString();

  try {
    await client.query('BEGIN');

    const transfer = await insertTransfer(executor, {
      transferId: input.transferId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      status: 'pending'
    });

    const steps = await insertTransferSteps(executor, [
      { transferId: input.transferId, sequence: 1, name: 'reserve_funds', status: 'succeeded' },
      { transferId: input.transferId, sequence: 2, name: 'commit_transfer', status: 'pending' }
    ]);

    await insertTransactionEvent(executor, {
      eventType: 'transfers.initiated',
      resourceType: 'transfer',
      resourceId: input.transferId,
      payload: {
        transfer,
        steps,
        correlationId: context.correlationId,
        sessionId: context.sessionId ?? null
      },
      status: 'pending'
    });

    await client.query('COMMIT');

    const response: TransferStatusResponse = {
      transferId: input.transferId,
      status: 'pending',
      steps: steps.map((step) => ({
        name: step.name,
        status: step.status,
        occurredAt: step.occurredAt
      }))
    };

    await deps.cache.set(`transfer:${input.transferId}`, response, deps.cache.defaultTtlSeconds);

    const event: DomainEvent = {
      type: 'transfers.initiated',
      key: input.transferId,
      version: 1,
      occurredAt: now,
      payload: {
        transferId: input.transferId,
        status: response.status,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amount: input.amount,
        currency: input.currency,
        correlationId: context.correlationId,
        sessionId: context.sessionId ?? null
      }
    };

    await deps.events.publish(event);

    return response;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // eslint-disable-next-line no-console
      console.error('Failed to roll back transfer workflow transaction', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getTransferStatus(
  deps: TransferWorkflowDependencies,
  transferId: string
): Promise<TransferStatusResponse | null> {
  const cached = await deps.cache.get<TransferStatusResponse>(`transfer:${transferId}`);
  if (cached) {
    return cached;
  }

  const transfer = await fetchTransfer(deps.datastore, transferId);
  if (!transfer) {
    return null;
  }

  const steps = await fetchTransferSteps(deps.datastore, transferId);
  const response: TransferStatusResponse = {
    transferId,
    status: transfer.status,
    steps: steps.map((step) => ({
      name: step.name,
      status: step.status,
      occurredAt: step.occurredAt
    }))
  };

  await deps.cache.set(`transfer:${transferId}`, response, deps.cache.defaultTtlSeconds);
  return response;
}

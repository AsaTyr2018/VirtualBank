export type DomainEventType =
  | 'transfers.initiated'
  | 'transfers.status'
  | 'credits.received'
  | 'market.orders.accepted'
  | 'sessions.lifecycle';

export interface DomainEvent<TPayload = unknown> {
  type: DomainEventType;
  key: string;
  version: number;
  payload: TPayload;
  occurredAt?: string;
}

export interface DomainEventEnvelope<TPayload = unknown> {
  key: string;
  type: DomainEventType;
  version: number;
  occurredAt: string;
  payload: TPayload;
}

export function serializeDomainEvent<TPayload>(event: DomainEvent<TPayload>): DomainEventEnvelope<TPayload> {
  return {
    key: event.key,
    type: event.type,
    version: event.version,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    payload: event.payload
  };
}

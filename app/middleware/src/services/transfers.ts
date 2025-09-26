import crypto from 'node:crypto';
import type { Datastore } from '../plugins/datastore.js';

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

export async function createTransferWorkflow(
  datastore: Datastore,
  input: TransferWorkflowInput
): Promise<TransferStatusResponse> {
  const client = await datastore.pool.connect();
  const now = new Date().toISOString();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO transfers (
        transfer_id,
        source_account_id,
        destination_account_id,
        amount,
        currency,
        note,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [
        input.transferId,
        input.sourceAccountId,
        input.destinationAccountId,
        input.amount.toString(),
        input.currency,
        input.note ?? null,
        'pending',
        now
      ]
    );

    await client.query(
      `INSERT INTO transfer_steps (step_id, transfer_id, sequence, name, status, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6),
              ($7, $2, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(),
        input.transferId,
        1,
        'reserve_funds',
        'succeeded',
        now,
        crypto.randomUUID(),
        2,
        'commit_transfer',
        'pending',
        now
      ]
    );

    await client.query('COMMIT');

    return {
      transferId: input.transferId,
      status: 'pending',
      steps: [
        { name: 'reserve_funds', status: 'succeeded', occurredAt: now },
        { name: 'commit_transfer', status: 'pending', occurredAt: now }
      ]
    };
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
  datastore: Datastore,
  transferId: string
): Promise<TransferStatusResponse | null> {
  const transferResult = await datastore.query<{
    transfer_id: string;
    status: string;
  }>('SELECT transfer_id, status FROM transfers WHERE transfer_id = $1', [transferId]);

  if (transferResult.rowCount === 0) {
    return null;
  }

  const stepsResult = await datastore.query<{
    name: string;
    status: string;
    occurred_at: Date;
    sequence: number;
  }>('SELECT name, status, occurred_at, sequence FROM transfer_steps WHERE transfer_id = $1 ORDER BY sequence', [transferId]);

  return {
    transferId,
    status: transferResult.rows[0].status,
    steps: stepsResult.rows.map((row) => ({
      name: row.name,
      status: row.status,
      occurredAt: new Date(row.occurred_at).toISOString()
    }))
  };
}

import type { Datastore } from '../plugins/datastore.js';

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

export async function submitCreditApplication(datastore: Datastore, input: CreditApplicationInput): Promise<void> {
  const now = new Date().toISOString();
  await datastore.query(
    `INSERT INTO credit_applications (
      application_id,
      player_id,
      account_id,
      requested_limit,
      currency,
      justification,
      collateral_type,
      attachments,
      status,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $10)
    ON CONFLICT (application_id) DO UPDATE SET
      requested_limit = EXCLUDED.requested_limit,
      currency = EXCLUDED.currency,
      justification = EXCLUDED.justification,
      collateral_type = EXCLUDED.collateral_type,
      attachments = EXCLUDED.attachments,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at`,
    [
      input.applicationId,
      input.playerId,
      input.accountId,
      input.requestedLimit.toString(),
      input.currency,
      input.justification,
      input.collateralType ?? null,
      JSON.stringify(input.attachments ?? []),
      'received',
      now
    ]
  );
}

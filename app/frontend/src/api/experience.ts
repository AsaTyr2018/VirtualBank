import { request } from './http';

export interface AccountSnapshot {
  id: string;
  ownerId: string;
  label: string;
  currency: string;
  availableBalance: number;
  heldBalance: number;
  status: string;
  change24h: number | null;
  updatedAt: string;
}

export interface QuestProgress {
  id: string;
  title: string;
  progress: number;
  target: number;
  reward: string;
}

export interface TransferActivity {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: string;
  occurredAt: string;
}

export interface MarketInstrumentSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  streakDays: number;
  funBalance: number;
  creditUtilization: number;
  achievements: string[];
}

export interface ExperienceSnapshot {
  player: PlayerProfile;
  accounts: AccountSnapshot[];
  quests: QuestProgress[];
  activity: TransferActivity[];
  market: MarketInstrumentSnapshot[];
  generatedAt: string;
}

export async function fetchExperienceSnapshot(): Promise<ExperienceSnapshot> {
  return request<ExperienceSnapshot>('/api/v1/experience/snapshot');
}

export interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface CreateTransferResponse {
  transferId: string;
  status: 'accepted';
  statusUrl: string;
}

export async function createTransfer(input: CreateTransferInput): Promise<CreateTransferResponse> {
  return request<CreateTransferResponse>('/api/v1/transfers', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

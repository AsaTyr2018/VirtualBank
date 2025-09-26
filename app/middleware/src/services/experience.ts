import crypto from 'node:crypto';
import type { Datastore } from '../plugins/datastore.js';

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

export interface ExperienceDependencies {
  datastore: Datastore;
}

function friendlyAccountLabel(accountId: string): string {
  if (accountId.toLowerCase().includes('vault')) {
    return 'Core Vault';
  }
  if (accountId.toLowerCase().includes('goal')) {
    return 'Quest Goals';
  }
  if (accountId.toLowerCase().includes('arcade')) {
    return 'Arcade Stash';
  }
  if (accountId.length <= 12) {
    return accountId.toUpperCase();
  }
  return `Account ${accountId.slice(0, 6).toUpperCase()}`;
}

function friendlySymbolName(symbol: string): string {
  const map: Record<string, string> = {
    BANKX: 'BankSim Prime',
    VRQL: 'VirtuQuest Labs',
    MNE: 'MemeNation Energy',
    PIX: 'PixelForge Studios'
  };
  return map[symbol.toUpperCase()] ?? symbol.toUpperCase();
}

function computeDeterministicChange(seed: string): number {
  const hash = crypto.createHash('sha1').update(seed).digest('hex');
  const bucket = parseInt(hash.slice(0, 4), 16);
  const normalized = bucket / 0xffff; // 0-1
  return Number(((normalized - 0.5) * 12).toFixed(1));
}

function mapSentiment(change: number): 'bullish' | 'bearish' | 'neutral' {
  if (change > 0.75) {
    return 'bullish';
  }
  if (change < -0.75) {
    return 'bearish';
  }
  return 'neutral';
}

function buildAchievements(totalTransfers: number, approvedCredits: number, marketOrders: number): string[] {
  const achievements: string[] = [];
  if (totalTransfers > 0) {
    achievements.push(`Transfers processed: ${totalTransfers}`);
  }
  if (approvedCredits > 0) {
    achievements.push(`Credit approvals secured: ${approvedCredits}`);
  }
  if (marketOrders > 0) {
    achievements.push(`Market orders placed: ${marketOrders}`);
  }
  return achievements.length > 0 ? achievements : ['Welcome to VirtualBank!'];
}

export async function getExperienceSnapshot({ datastore }: ExperienceDependencies): Promise<ExperienceSnapshot> {
  const [accountResult, transferResult, creditResult, marketResult] = await Promise.all([
    datastore.query(
      `SELECT account_id, player_id, currency, status, available_balance, held_balance, updated_at
         FROM accounts
         ORDER BY updated_at DESC
         LIMIT 12`
    ),
    datastore.query(
      `SELECT transfer_id, source_account_id, destination_account_id, amount, currency, status, created_at
         FROM transfers
         ORDER BY created_at DESC
         LIMIT 12`
    ),
    datastore.query(
      `SELECT status
         FROM credit_applications`
    ),
    datastore.query(
      `SELECT order_id, account_id, symbol, side, order_type, quantity, limit_price, status, created_at
         FROM market_orders
         ORDER BY created_at DESC
         LIMIT 12`
    )
  ]);

  const accounts: AccountSnapshot[] = accountResult.rows.map((row) => {
    const available = Number(row.available_balance ?? 0);
    const held = Number(row.held_balance ?? 0);
    const changeSeed = `${row.account_id}:${row.updated_at}`;
    const hasAccounts = (accountResult.rowCount ?? accountResult.rows.length) > 0;
    const change = hasAccounts ? computeDeterministicChange(changeSeed) : null;

    return {
      id: row.account_id,
      ownerId: row.player_id ?? 'player',
      label: friendlyAccountLabel(row.account_id),
      currency: row.currency ?? 'VBC',
      availableBalance: available,
      heldBalance: held,
      status: row.status ?? 'active',
      change24h: change,
      updatedAt: new Date(row.updated_at).toISOString()
    };
  });

  const totalAvailable = accounts.reduce((total, account) => total + account.availableBalance, 0);
  const totalHeld = accounts.reduce((total, account) => total + account.heldBalance, 0);

  const transfers: TransferActivity[] = transferResult.rows.map((row) => ({
    id: row.transfer_id,
    description: `Transfer ${row.source_account_id} → ${row.destination_account_id}`,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'VBC',
    type: Number(row.amount ?? 0) >= 0 ? 'debit' : 'credit',
    status: row.status ?? 'pending',
    occurredAt: new Date(row.created_at).toISOString()
  }));

  const totalTransfers = transfers.length;
  const approvedCredits = creditResult.rows.filter((row) => row.status?.toLowerCase() === 'approved').length;
  const marketOrders = marketResult.rows.length;

  const quests: QuestProgress[] = [
    {
      id: 'quest-transfers',
      title: 'Complete 5 transfers this week',
      progress: Math.min(totalTransfers, 5),
      target: 5,
      reward: '+120 XP'
    },
    {
      id: 'quest-credits',
      title: 'Secure 3 credit approvals',
      progress: Math.min(approvedCredits, 3),
      target: 3,
      reward: '+350 FunCoins'
    },
    {
      id: 'quest-market',
      title: 'Place 4 market orders',
      progress: Math.min(marketOrders, 4),
      target: 4,
      reward: '+1.5× yield day'
    }
  ];

  const market: MarketInstrumentSnapshot[] = marketResult.rows.map((row) => {
    const price = row.limit_price ? Number(row.limit_price) : Number(row.quantity ?? 0) * 10;
    const change = computeDeterministicChange(`${row.order_id}:${row.symbol}`);
    return {
      symbol: row.symbol?.toUpperCase() ?? 'VBX',
      name: friendlySymbolName(row.symbol ?? 'VBX'),
      price: Number(price.toFixed(2)),
      change,
      sentiment: mapSentiment(change)
    };
  });

  const firstTransfer = transfers[transfers.length - 1];
  const lastTransfer = transfers[0];
  const streakDays = firstTransfer && lastTransfer
    ? Math.max(
        1,
        Math.round(
          (new Date(lastTransfer.occurredAt).getTime() - new Date(firstTransfer.occurredAt).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 0;

  const playerId = accounts[0]?.ownerId ?? 'player';

  const player: PlayerProfile = {
    id: playerId,
    displayName: accounts[0]?.label ?? 'VirtualBank Explorer',
    streakDays,
    funBalance: Number(totalAvailable.toFixed(2)),
    creditUtilization:
      totalAvailable + totalHeld > 0 ? Number(((totalHeld / (totalAvailable + totalHeld)) * 100).toFixed(1)) : 0,
    achievements: buildAchievements(totalTransfers, approvedCredits, marketOrders)
  } as PlayerProfile;

  return {
    player,
    accounts,
    quests,
    activity: transfers,
    market,
    generatedAt: new Date().toISOString()
  };
}

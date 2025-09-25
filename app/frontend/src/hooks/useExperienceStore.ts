import { create } from 'zustand';

export interface AccountSnapshot {
  id: string;
  name: string;
  balance: number;
  change: number;
}

export interface Quest {
  id: string;
  title: string;
  progress: number;
  reward: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  timestamp: string;
}

export interface MarketInstrument {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface ExperienceState {
  playerName: string;
  streakDays: number;
  funBalance: number;
  creditUtilization: number;
  achievements: string[];
  onboardingStep: number;
  onboardingCompleted: boolean;
  accounts: AccountSnapshot[];
  quests: Quest[];
  transactions: Transaction[];
  market: MarketInstrument[];
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
}

const initialAccounts: AccountSnapshot[] = [
  { id: 'vault', name: 'Core Vault', balance: 12850, change: 8.5 },
  { id: 'goals', name: 'Quest Goals', balance: 4250, change: 3.2 },
  { id: 'arcade', name: 'Arcade Stash', balance: 1860, change: -1.2 }
];

const initialQuests: Quest[] = [
  { id: 'quest-1', title: 'Send 3 gratitude transfers', progress: 2, reward: '+120 XP' },
  { id: 'quest-2', title: 'Hold 5 tickers in watchlist', progress: 4, reward: '+1.5× yield day' },
  { id: 'quest-3', title: 'Complete credit wellness check', progress: 1, reward: '+350 FunCoins' }
];

const initialTransactions: Transaction[] = [
  { id: 'txn-1024', description: 'Quest reward: Orbit Mall pop-up', amount: 420, type: 'credit', timestamp: '5 min ago' },
  { id: 'txn-1023', description: 'Transfer to Nova Sparks', amount: -180, type: 'debit', timestamp: '12 min ago' },
  { id: 'txn-1022', description: 'Market trade: BANKX', amount: 260, type: 'credit', timestamp: '42 min ago' },
  { id: 'txn-1021', description: 'Arcade upgrade', amount: -75, type: 'debit', timestamp: '2 hrs ago' }
];

const initialMarket: MarketInstrument[] = [
  { symbol: 'BANKX', name: 'BankSim Prime', price: 128.4, change: 3.2, sentiment: 'bullish' },
  { symbol: 'VRQL', name: 'VirtuQuest Labs', price: 84.1, change: -1.6, sentiment: 'neutral' },
  { symbol: 'MNE', name: 'MemeNation Energy', price: 42.9, change: 5.7, sentiment: 'bullish' },
  { symbol: 'PIX', name: 'PixelForge Studios', price: 216.5, change: -3.8, sentiment: 'bearish' }
];

export const useExperienceStore = create<ExperienceState>((set) => ({
  playerName: 'Riley Quartz',
  streakDays: 28,
  funBalance: 18960,
  creditUtilization: 42,
  achievements: ['Orbit League Top 5%', 'Community Vault Steward', 'Arcade Maestro'],
  onboardingStep: 1,
  onboardingCompleted: false,
  accounts: initialAccounts,
  quests: initialQuests,
  transactions: initialTransactions,
  market: initialMarket,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () => set({ onboardingCompleted: true, onboardingStep: 4 })
}));

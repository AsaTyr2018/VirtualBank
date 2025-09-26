import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { appConfig } from '../config';
import { getSessionId } from '../lib/session';
import type { ExperienceSnapshot, TransferActivity } from '../api/experience';

interface SessionStreamMessage {
  type: string;
  portfolio?: {
    cashBalance?: number;
    currency?: string;
  };
  recentActivity?: Array<{
    id: string;
    status: string;
    occurredAt: string;
  }>;
}

function enrichActivity(update: SessionStreamMessage['recentActivity']): TransferActivity[] {
  if (!update) {
    return [];
  }
  return update.map((item) => ({
    id: item.id,
    description: `Workflow update: ${item.status}`,
    amount: 0,
    currency: 'VBC',
    type: 'credit',
    status: item.status,
    occurredAt: item.occurredAt
  }));
}

export function useSessionStream(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const base = new URL(`${appConfig.middleware.baseUrl}/api/v1/sessions/stream`);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.searchParams.set('apiKey', appConfig.middleware.apiKey);
    base.searchParams.set('sessionId', getSessionId());

    const socket = new WebSocket(base.toString());

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as SessionStreamMessage;
        if (payload.type === 'session.stream.update') {
          queryClient.setQueryData<ExperienceSnapshot>(['experienceSnapshot'], (current) => {
            if (!current) {
              return current;
            }

            const updated: ExperienceSnapshot = {
              ...current,
              generatedAt: new Date().toISOString()
            };

            if (payload.portfolio?.cashBalance !== undefined) {
              updated.player = {
                ...updated.player,
                funBalance: payload.portfolio.cashBalance
              };
              if (updated.accounts.length > 0) {
                updated.accounts = [
                  {
                    ...updated.accounts[0],
                    availableBalance: payload.portfolio.cashBalance,
                    currency: payload.portfolio.currency ?? updated.accounts[0].currency
                  },
                  ...updated.accounts.slice(1)
                ];
              }
            }

            const recentActivity = enrichActivity(payload.recentActivity);
            if (recentActivity.length > 0) {
              updated.activity = [...recentActivity, ...updated.activity].slice(0, 12);
            }

            return updated;
          });
        }
      } catch (error) {
        console.error('Failed to parse session stream payload', error);
      }
    });

    return () => {
      socket.close();
    };
  }, [enabled, queryClient]);
}

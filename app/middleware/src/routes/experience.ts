import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { getExperienceSnapshot } from '../services/experience.js';

const AccountSnapshotSchema = Type.Object({
  id: Type.String(),
  ownerId: Type.String(),
  label: Type.String(),
  currency: Type.String(),
  availableBalance: Type.Number(),
  heldBalance: Type.Number(),
  status: Type.String(),
  change24h: Type.Union([Type.Number(), Type.Null()]),
  updatedAt: Type.String({ format: 'date-time' })
});

const QuestSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  progress: Type.Number(),
  target: Type.Number(),
  reward: Type.String()
});

const ActivitySchema = Type.Object({
  id: Type.String(),
  description: Type.String(),
  amount: Type.Number(),
  currency: Type.String(),
  type: Type.Union([Type.Literal('credit'), Type.Literal('debit')]),
  status: Type.String(),
  occurredAt: Type.String({ format: 'date-time' })
});

const MarketSchema = Type.Object({
  symbol: Type.String(),
  name: Type.String(),
  price: Type.Number(),
  change: Type.Number(),
  sentiment: Type.Union([Type.Literal('bullish'), Type.Literal('bearish'), Type.Literal('neutral')])
});

const PlayerSchema = Type.Object({
  id: Type.String(),
  displayName: Type.String(),
  streakDays: Type.Number(),
  funBalance: Type.Number(),
  creditUtilization: Type.Number(),
  achievements: Type.Array(Type.String())
});

const ExperienceSnapshotResponse = Type.Object({
  player: PlayerSchema,
  accounts: Type.Array(AccountSnapshotSchema),
  quests: Type.Array(QuestSchema),
  activity: Type.Array(ActivitySchema),
  market: Type.Array(MarketSchema),
  generatedAt: Type.String({ format: 'date-time' })
});

export async function experienceRoutes(app: FastifyInstance) {
  app.get(
    '/api/v1/experience/snapshot',
    {
      config: {
        requiredRoles: ['bank:transfers:read']
      },
      schema: {
        response: {
          200: ExperienceSnapshotResponse
        }
      }
    },
    async () => {
      return getExperienceSnapshot({ datastore: app.datastore });
    }
  );
}

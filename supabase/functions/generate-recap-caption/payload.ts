import { z } from 'https://esm.sh/zod@3.23.8';

import type { CaptionFacts, CaptionTone } from './prompt.ts';

/**
 * Every field is bounded. The payload is built by the admin screen from frozen
 * facts, but this function must not trust its own client any more than it
 * trusts anything else on the internet.
 */
export const FactsSchema = z
  .object({
    seasonName: z.string().trim().min(1).max(120),
    weekNumber: z.number().int().min(1).max(60),
    upsets: z
      .array(
        z
          .object({
            winnerName: z.string().trim().max(120),
            loserName: z.string().trim().max(120),
            matchResult: z.string().trim().max(20),
            winnerProbability: z.number().finite().min(0).max(1),
          })
          .strict()
      )
      .max(5),
    hotStreaks: z
      .array(
        z
          .object({
            teamName: z.string().trim().max(120),
            streakCount: z.number().int().min(0).max(100),
            division: z.string().trim().max(80),
          })
          .strict()
      )
      .max(5),
    teamOfTheWeek: z
      .object({ teamName: z.string().trim().max(120), delta: z.number().finite() })
      .strict()
      .nullable(),
    risers: z
      .array(
        z.object({ teamName: z.string().trim().max(120), delta: z.number().finite() }).strict()
      )
      .max(5),
    divisionLeaders: z
      .array(
        z
          .object({
            divisionName: z.string().trim().max(80),
            teamName: z.string().trim().max(120),
            wins: z.number().int().min(0).max(200),
            losses: z.number().int().min(0).max(200),
          })
          .strict()
      )
      .max(8),
  })
  .strict();

export const PayloadSchema = z
  .object({
    facts: FactsSchema,
    commissionerNote: z.string().trim().max(500).optional(),
    tone: z.enum(['hype', 'straight', 'playful']).default('straight'),
  })
  .strict();

export type CaptionPayload = {
  facts: CaptionFacts;
  commissionerNote?: string;
  tone: CaptionTone;
};

import { z } from 'https://esm.sh/zod@3.23.8';

import type { CaptionFacts, CaptionTone, RankingsFacts } from './prompt.ts';

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
    kind: z.literal('caption').default('caption'),
    facts: FactsSchema,
    commissionerNote: z.string().trim().max(500).optional(),
    tone: z.enum(['hype', 'straight', 'playful']).default('straight'),
  })
  .strict();

export type CaptionPayload = {
  kind: 'caption';
  facts: CaptionFacts;
  commissionerNote?: string;
  tone: CaptionTone;
};

/**
 * One team's row, trimmed to what a blurb can honestly be written from.
 *
 * Deliberately no opponents and no per-game detail: the writer cannot say a
 * team beat somebody if it was never told who played whom.
 */
export const RankingsTeamSchema = z
  .object({
    teamId: z.string().uuid(),
    teamName: z.string().trim().max(120),
    division: z.string().trim().max(80),
    rank: z.number().int().min(1).max(200),
    previousRank: z.number().int().min(1).max(200).nullable(),
    grade: z.string().trim().max(2).nullable(),
    wins: z.number().int().min(0).max(200),
    losses: z.number().int().min(0).max(200),
    powerScore: z.number().finite().nullable(),
    delta: z.number().finite().nullable(),
  })
  .strict();

export const RankingsFactsSchema = z
  .object({
    seasonName: z.string().trim().min(1).max(120),
    weekNumber: z.number().int().min(1).max(60),
    // Comfortably above the league's 26, and a hard stop on an oversized call.
    teams: z.array(RankingsTeamSchema).min(1).max(40),
  })
  .strict();

export const RankingsPayloadSchema = z
  .object({
    kind: z.literal('rankings'),
    facts: RankingsFactsSchema,
    commissionerNote: z.string().trim().max(500).optional(),
    tone: z.enum(['hype', 'straight', 'playful']).default('straight'),
  })
  .strict();

export type RankingsPayload = {
  kind: 'rankings';
  facts: RankingsFacts;
  commissionerNote?: string;
  tone: CaptionTone;
};

/**
 * What the model is allowed to return. Anything else is dropped rather than
 * trusted — see `keepKnownTeams`.
 */
export const BlurbReplySchema = z.array(
  z.object({ teamId: z.string(), blurb: z.string() }).passthrough()
);

/**
 * Keep only blurbs for teams that were actually sent, one each, in the order
 * they were sent.
 *
 * This is what stops a generated reply inventing a team. The model is told to
 * echo the teamIds it was given; this makes it so whether it obeys or not.
 */
export const keepKnownTeams = (
  reply: Array<{ teamId: string; blurb: string }>,
  sent: Array<{ teamId: string }>,
  maxLength = 200
): Record<string, string> => {
  const known = new Set(sent.map((t) => t.teamId));
  const blurbs: Record<string, string> = {};

  for (const item of reply) {
    if (!known.has(item.teamId)) continue;
    if (item.teamId in blurbs) continue;
    const text = item.blurb.trim().slice(0, maxLength);
    if (text !== '') blurbs[item.teamId] = text;
  }

  return blurbs;
};

/**
 * Pull the JSON array out of a reply, tolerating a code fence or a stray
 * sentence around it. Returns null when there is nothing parseable.
 */
export const extractJsonArray = (text: string): unknown => {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
};

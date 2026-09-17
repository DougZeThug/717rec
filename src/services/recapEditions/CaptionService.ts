import { supabase } from '@/integrations/supabase/client';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { throwEdgeFunctionError } from '@/utils/edgeFunctionError';

export type CaptionTone = 'hype' | 'straight' | 'playful';

export interface CaptionResult {
  caption: string;
  model: string;
}

/**
 * Raised when ANTHROPIC_API_KEY is not set on the project.
 *
 * Kept distinct from an ordinary failure so the screen can say "captions are
 * not set up" instead of "something went wrong" — one of those tells the admin
 * what to do about it.
 */
export class CaptionUnconfiguredError extends Error {
  constructor() {
    super('Caption generation is not configured');
    this.name = 'CaptionUnconfiguredError';
  }
}

/**
 * Only the fields the caption needs. Team ids and logo URLs are stripped — the
 * model has no use for them, and there is no reason to send them anywhere.
 */
const toCaptionFacts = (facts: RecapFactsV1) => ({
  seasonName: facts.seasonName,
  weekNumber: facts.weekNumber,
  upsets: facts.upsets.slice(0, 5).map((upset) => ({
    winnerName: upset.winnerName,
    loserName: upset.loserName,
    matchResult: upset.matchResult,
    winnerProbability: upset.winnerProbability,
  })),
  hotStreaks: facts.hotStreaks.slice(0, 5).map((streak) => ({
    teamName: streak.teamName,
    streakCount: streak.streakCount,
    division: streak.division,
  })),
  teamOfTheWeek: facts.teamOfTheWeek
    ? { teamName: facts.teamOfTheWeek.teamName, delta: facts.teamOfTheWeek.delta }
    : null,
  risers: facts.movers.risers
    .slice(0, 5)
    .map((riser) => ({ teamName: riser.teamName, delta: riser.delta })),
  divisionLeaders: facts.divisions.slice(0, 8).flatMap((division) => {
    const leader = division.standings[0];
    return leader
      ? [
          {
            divisionName: division.divisionName,
            teamName: leader.teamName,
            wins: leader.wins,
            losses: leader.losses,
          },
        ]
      : [];
  }),
});

export const generateCaption = async (
  facts: RecapFactsV1,
  commissionerNote: string,
  tone: CaptionTone = 'straight'
): Promise<CaptionResult> => {
  const { data, error } = await supabase.functions.invoke('generate-recap-caption', {
    body: {
      facts: toCaptionFacts(facts),
      commissionerNote: commissionerNote.trim() || undefined,
      tone,
    },
  });

  if (error) {
    // The 503 the function returns when the key is missing arrives here as a
    // generic FunctionsHttpError, so the body has to be read to tell the two
    // apart before the shared handler flattens it into a message.
    const response = (error as { context?: Response }).context;
    if (response?.status === 503) {
      throw new CaptionUnconfiguredError();
    }
    await throwEdgeFunctionError(error, 'Failed to generate the caption');
  }

  const result = data as Partial<CaptionResult> | null;
  if (!result?.caption) {
    throw new Error('The caption came back empty. Try again.');
  }

  return { caption: result.caption, model: result.model ?? 'unknown' };
};

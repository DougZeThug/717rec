import { PowerScoreWeights } from '@/utils/powerScore/weights';

/** Render a 0-100 power score to one decimal. */
export const formatScore = (score: number): string => score.toFixed(1);

/** Render a signed score delta to one decimal. */
export const formatDelta = (delta: number): string => {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
};

/** "40/45/15" — the win/SOS/game triple as users see it everywhere in this tab. */
export const formatTriple = (weights: PowerScoreWeights): string =>
  `${weights.win}/${weights.sos}/${weights.game}`;

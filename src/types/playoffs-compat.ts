
import { PlayoffMatch } from '@/types/playoffs';

export { PlayoffMatch } from '@/types/playoffs';

/** DEPRECATED – use PlayoffMatch */
export type PlayoffMatchType = "winners" | "losers" | "finals" | "play-in" | "play-in-2";

/** Minimal stub so tests compile. Remove once ScoreParser migrates. */
export interface PlayoffGame {
  id: string;
  matchId?: string;
  gameNumber?: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winner?: string;
}

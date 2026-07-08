import type { GameRules } from './types';

// League rule (confirmed with the league admin): first to 21, must win by 2.
// No bust rule, no hard cap. Change game rules only here.
export const DEFAULT_GAME_RULES: GameRules = {
  targetScore: 21,
  winBy: 2,
  hardCap: null,
};

export const BEST_OF = 3;
export const GAMES_TO_WIN_MATCH = 2;
export const MAX_PLAYERS_PER_SIDE = 2;

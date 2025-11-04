import { z } from 'zod';

/**
 * Validation schema for match score updates
 */
export const matchScoreSchema = z.object({
  team1Score: z.number().int().min(0).max(100),
  team2Score: z.number().int().min(0).max(100),
  team1GameWins: z.number().int().min(0).max(100),
  team2GameWins: z.number().int().min(0).max(100),
}).refine(
  (data) => data.team1GameWins !== data.team2GameWins,
  {
    message: "Match cannot end in a tie - one team must win more games",
    path: ["team1GameWins"]
  }
);

/**
 * Validation schema for brackets-manager score updates
 */
export const bracketsManagerScoreSchema = z.object({
  matchId: z.number().int().positive(),
  scores: z.object({
    opponent1: z.object({
      score: z.number().int().min(0).max(100).optional(),
      result: z.enum(["win", "loss", "draw"]).optional()
    }).optional(),
    opponent2: z.object({
      score: z.number().int().min(0).max(100).optional(),
      result: z.enum(["win", "loss", "draw"]).optional()
    }).optional()
  }).refine(
    (data) => data.opponent1 || data.opponent2,
    {
      message: "At least one opponent score must be provided"
    }
  )
});

export type MatchScoreInput = z.infer<typeof matchScoreSchema>;
export type BracketsManagerScoreInput = z.infer<typeof bracketsManagerScoreSchema>;

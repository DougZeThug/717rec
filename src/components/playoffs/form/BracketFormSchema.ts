import { z } from 'zod';

import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';

export const bracketFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  divisionId: z.string().min(1, 'Division is required'),
  divisionName: z.string().optional(),
  format: z.enum(['Single Elimination', 'Double Elimination']),
  teams: z
    .array(z.string())
    .min(MIN_BRACKET_TEAMS, `At least ${MIN_BRACKET_TEAMS} teams are required`)
    .max(MAX_BRACKET_TEAMS, `Maximum ${MAX_BRACKET_TEAMS} teams allowed`),
  grandFinalType: z.enum(['simple', 'double']),
  teamSeeds: z.record(z.string(), z.number()).optional(),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

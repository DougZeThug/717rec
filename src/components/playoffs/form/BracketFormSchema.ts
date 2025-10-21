
import { z } from "zod";

const VALID_TEAM_COUNTS = [2, 4, 8, 16] as const;

export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().min(1, "Division is required"),
  divisionName: z.string().optional(), // Add division name for easier filtering
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string())
    .min(2, "At least 2 teams are required")
    .max(16, "Maximum 16 teams allowed")
    .refine(
      (teams) => VALID_TEAM_COUNTS.includes(teams.length as any),
      { message: "Please select exactly 2, 4, 8, or 16 teams (required by tournament system)" }
    ),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

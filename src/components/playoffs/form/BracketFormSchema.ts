
import { z } from "zod";

export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().min(1, "Division is required"),
  divisionName: z.string().optional(),
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string())
    .min(2, "At least 2 teams are required")
    .max(32, "Maximum 32 teams allowed"),
  grandFinalType: z.enum(["simple", "double"]).default("simple"),
  teamSeeds: z.record(z.string(), z.number()).optional(),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;
export type BracketFormInput = z.input<typeof bracketFormSchema>;

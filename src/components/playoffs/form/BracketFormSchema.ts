
import * as z from "zod";
import { BRACKET_FORMATS, BracketFormat } from "@/constants/brackets";

// Define the form schema with zod
export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().min(1, "Division is required"),
  format: z.enum([BRACKET_FORMATS.SINGLE, BRACKET_FORMATS.DOUBLE] as const),
  teams: z.array(z.string()).min(2, "At least 2 teams are required"),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

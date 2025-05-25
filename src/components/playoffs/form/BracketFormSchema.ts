
import * as z from "zod";
import { BRACKET_FORMATS, BracketFormat } from "@/constants/brackets";

// UUID validation helper
const uuidSchema = z.string().uuid("Invalid UUID format").optional().or(z.literal(""));

// Enhanced form schema with proper UUID validation
export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().uuid("Please select a valid division"),
  format: z.enum([BRACKET_FORMATS.SINGLE, BRACKET_FORMATS.DOUBLE] as const),
  teams: z.array(z.string().uuid("Invalid team ID format")).min(2, "At least 2 teams are required"),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

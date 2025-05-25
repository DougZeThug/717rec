
import * as z from "zod";
import { BRACKET_FORMATS, BracketFormat } from "@/constants/brackets";

// Enhanced UUID validation that explicitly rejects empty strings
const uuidFieldSchema = z.string()
  .refine((val) => val !== "", "Please select a valid option")
  .uuid("Invalid UUID format");

// Enhanced form schema with proper UUID validation and empty string prevention
export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: uuidFieldSchema.refine((val) => val && val.trim() !== "", "Please select a division"),
  format: z.enum([BRACKET_FORMATS.SINGLE, BRACKET_FORMATS.DOUBLE] as const),
  teams: z.array(z.string().uuid("Invalid team ID format"))
    .min(2, "At least 2 teams are required")
    .refine((teams) => teams.every(id => id && id.trim() !== ""), "All selected teams must be valid"),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

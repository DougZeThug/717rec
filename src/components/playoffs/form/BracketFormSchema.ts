
import { z } from "zod";

export const bracketFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().min(1, "Division is required"),
  divisionName: z.string().optional(), // Add division name for easier filtering
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string()).min(2, "At least 2 teams are required").max(16, "Maximum 16 teams allowed"),
});

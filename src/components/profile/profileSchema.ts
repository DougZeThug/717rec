import { z } from 'zod';

/**
 * Validation schema for the profile setup/edit form. Lives next to the form
 * (its only runtime user) instead of in ProfileService so the zod library
 * stays out of the eagerly-loaded main bundle.
 */
export const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'First name must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'First name can only contain letters, numbers, and underscores'),
  fullName: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
